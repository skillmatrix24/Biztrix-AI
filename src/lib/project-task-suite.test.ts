import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProjectProgress,
  filterTasksByProject,
  calculateProjectFinancials,
  calculateMilestoneProgress,
  resolveTaskAssigneeIds,
  isTaskAssignedToUser,
} from './project-task-suite';

test('Project-Task Suite: Project Progress Derivation from Tasks', () => {
  const tasks = [
    { id: 't1', status: 'completed' },
    { id: 't2', status: 'completed' },
    { id: 't3', status: 'in-progress' },
    { id: 't4', status: 'pending' },
  ];

  const stats = calculateProjectProgress(tasks);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 2);
  assert.equal(stats.working, 1);
  assert.equal(stats.pending, 1);
  assert.equal(stats.progressPercentage, 50); // 2 out of 4 = 50%

  // Empty tasks handles gracefully
  const empty = calculateProjectProgress([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.progressPercentage, 0);
});

test('Project-Task Suite: Filtering Tasks by Project and Search Query', () => {
  const tasks = [
    { id: 't1', title: 'Design Landing Page', projectId: 'p1', projectName: 'Website Redesign', assignedName: 'Ramesh' },
    { id: 't2', title: 'Setup Stripe Gateway', projectId: 'p1', projectName: 'Website Redesign', assignedName: 'Suresh' },
    { id: 't3', title: 'Inventory Audit', projectId: 'p2', projectName: 'Warehouse ERP', assignedName: 'Pooja' },
    { id: 't4', title: 'Office Stationery Purchase', projectId: null, projectName: null, assignedName: 'Amit' },
  ];

  // Filter by Project p1
  const p1Tasks = filterTasksByProject(tasks as any, 'p1');
  assert.equal(p1Tasks.length, 2);
  assert.equal(p1Tasks[0].id, 't1');
  assert.equal(p1Tasks[1].id, 't2');

  // Filter by Standalone (no project)
  const standaloneTasks = filterTasksByProject(tasks as any, 'standalone');
  assert.equal(standaloneTasks.length, 1);
  assert.equal(standaloneTasks[0].id, 't4');

  // Filter by All
  const allTasks = filterTasksByProject(tasks as any, 'all');
  assert.equal(allTasks.length, 4);

  // Search by Project Name
  const searchByProject = filterTasksByProject(tasks as any, 'all', 'Warehouse');
  assert.equal(searchByProject.length, 1);
  assert.equal(searchByProject[0].id, 't3');

  // Search by Assignee
  const searchByAssignee = filterTasksByProject(tasks as any, 'all', 'Suresh');
  assert.equal(searchByAssignee.length, 1);
  assert.equal(searchByAssignee[0].id, 't2');
});

test('Project-Task Suite: Financial Ledger & Collection Rate Calculations', () => {
  const transactions = [
    { type: 'credit', amount: 50000 }, // Advance payment
    { type: 'credit', amount: 25000 }, // Milestone 1
    { type: 'debit', amount: 15000 },  // Vendor software license
    { type: 'debit', amount: 10000 },  // Design assets
  ];

  const financials = calculateProjectFinancials(100000, transactions, 10000); // 100k + 10k addons = 110k total value
  assert.equal(financials.totalProjectValue, 110000);
  assert.equal(financials.revenue, 75000);
  assert.equal(financials.expense, 25000);
  assert.equal(financials.profit, 50000);
  assert.equal(financials.outstandingBalance, 35000); // 110k - 75k = 35k
  assert.equal(financials.collectionRate, 68); // 75k / 110k = 68%
});

test('Project-Task Suite: Milestone Progress Tracking', () => {
  const milestones = [
    { id: 'm1', label: 'Wireframes', amount: 20000, status: 'completed' },
    { id: 'm2', label: 'Frontend MVP', amount: 40000, status: 'approved_by_client' },
    { id: 'm3', label: 'Final Delivery', amount: 40000, status: 'pending' },
  ];

  const progress = calculateMilestoneProgress(milestones);
  assert.equal(progress.totalMilestones, 3);
  assert.equal(progress.completedMilestones, 1);
  assert.equal(progress.approvedMilestones, 2); // m1 (completed) + m2 (approved_by_client)
  assert.equal(progress.milestoneProgressPercentage, 33);
  assert.equal(progress.totalBilledAmount, 20000);
});

test('Project-Task Suite: Multi-Assignee Task Resolution and Search', () => {
  // Single string assignedTo
  const taskSingle = { id: 't1', assignedTo: 'user_1', assignedName: 'Karan Singh' };
  assert.deepEqual(resolveTaskAssigneeIds(taskSingle), ['user_1']);
  assert.equal(isTaskAssignedToUser(taskSingle, 'user_1'), true);
  assert.equal(isTaskAssignedToUser(taskSingle, 'user_2'), false);

  // Array assignedTo
  const taskMultiple = {
    id: 't2',
    assignedTo: ['user_1', 'user_2', 'user_3'],
    assignedNames: ['Karan Singh', 'Neha Patil', 'Arjun Verma'],
    assignedName: 'Karan Singh, Neha Patil, Arjun Verma'
  };
  assert.deepEqual(resolveTaskAssigneeIds(taskMultiple), ['user_1', 'user_2', 'user_3']);
  assert.equal(isTaskAssignedToUser(taskMultiple, 'user_1'), true);
  assert.equal(isTaskAssignedToUser(taskMultiple, 'user_2'), true);
  assert.equal(isTaskAssignedToUser(taskMultiple, 'user_3'), true);
  assert.equal(isTaskAssignedToUser(taskMultiple, 'user_4'), false);

  // Search by any of the multiple assignees
  const tasks = [taskSingle, taskMultiple] as any;
  const matchKaran = filterTasksByProject(tasks, 'all', 'Karan');
  assert.equal(matchKaran.length, 2);

  const matchNeha = filterTasksByProject(tasks, 'all', 'Neha');
  assert.equal(matchNeha.length, 1);
  assert.equal(matchNeha[0].id, 't2');
});

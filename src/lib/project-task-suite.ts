/**
 * Back Office Suite: Projects & Task Management Engine
 * Provides synchronized business logic for project-task progress derivation,
 * financial health calculations, milestone completion tracking, and project-based task filtering.
 */

export interface TaskItem {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'testing' | 'review' | string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'emergency' | string;
  projectId?: string | null;
  projectName?: string | null;
  assignedTo?: string | string[];
  assignedIds?: string[];
  assignedNames?: string[];
  assignedName?: string;
  dueDate?: string;
  category?: string;
  section?: string;
  subtasks?: Array<{ id: string; text: string; isCompleted: boolean }>;
}

/**
 * Resolves all assignee IDs from a task (supporting string, string[], or assignedIds).
 */
export function resolveTaskAssigneeIds(task: { assignedTo?: any; assignedIds?: any } | null | undefined): string[] {
  if (!task) return [];
  if (Array.isArray(task.assignedTo)) return task.assignedTo.filter(Boolean);
  if (Array.isArray(task.assignedIds)) return task.assignedIds.filter(Boolean);
  if (typeof task.assignedTo === 'string' && task.assignedTo.trim() !== '') {
    return [task.assignedTo.trim()];
  }
  return [];
}

/**
 * Checks if a task is assigned to a specific user (handles single or multiple assignees).
 */
export function isTaskAssignedToUser(
  task: { assignedTo?: any; assignedIds?: any } | null | undefined,
  userId: string
): boolean {
  if (!task || !userId) return false;
  return resolveTaskAssigneeIds(task).includes(userId);
}

export interface ProjectItem {
  id: string;
  title: string;
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | string;
  estimatedValue?: number | string;
  clientName?: string;
  deadline?: string;
  milestones?: Array<{
    id: string;
    label: string;
    amount?: number;
    status: 'pending' | 'completed' | 'invoiced' | 'approved_by_client' | string;
  }>;
}

/**
 * Calculates live project task progress percentage and counts.
 */
export function calculateProjectProgress(tasks: Array<{ status?: string }>): {
  total: number;
  completed: number;
  working: number;
  pending: number;
  progressPercentage: number;
} {
  const list = tasks || [];
  const total = list.length;
  const completed = list.filter((t) => t.status === 'completed').length;
  const working = list.filter((t) => t.status === 'in-progress').length;
  const pending = list.filter((t) => t.status === 'pending' || !t.status).length;
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    working,
    pending,
    progressPercentage,
  };
}

/**
 * Filters tasks by project selection and search query.
 */
export function filterTasksByProject(
  tasks: TaskItem[],
  projectIdFilter: string = 'all',
  searchQuery: string = ''
): TaskItem[] {
  const cleanSearch = (searchQuery || '').trim().toLowerCase();

  return (tasks || []).filter((task) => {
    // 1. Project Filter
    const matchesProject =
      projectIdFilter === 'all' ||
      (projectIdFilter === 'standalone' && !task.projectId) ||
      task.projectId === projectIdFilter;

    if (!matchesProject) return false;

    // 2. Search Query (title, assignee, project name, category, or section)
    if (!cleanSearch) return true;

    const assignedNamesString = Array.isArray(task.assignedNames)
      ? task.assignedNames.join(' ')
      : (task.assignedName || '');

    return (
      task.title?.toLowerCase().includes(cleanSearch) ||
      assignedNamesString.toLowerCase().includes(cleanSearch) ||
      task.projectName?.toLowerCase().includes(cleanSearch) ||
      task.category?.toLowerCase().includes(cleanSearch) ||
      task.section?.toLowerCase().includes(cleanSearch)
    );
  });
}

/**
 * Computes financial metrics for a project based on cashbook debits and credits.
 */
export function calculateProjectFinancials(
  estimatedValue: number,
  transactions: Array<{ type: 'credit' | 'debit' | string; amount: number | string }> = [],
  addonsTotal: number = 0
): {
  totalProjectValue: number;
  revenue: number;
  expense: number;
  profit: number;
  outstandingBalance: number;
  collectionRate: number;
} {
  const baseValue = Number(estimatedValue) || 0;
  const totalProjectValue = baseValue + (Number(addonsTotal) || 0);

  const revenue = (transactions || [])
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expense = (transactions || [])
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const profit = revenue - expense;
  const outstandingBalance = Math.max(0, totalProjectValue - revenue);
  const collectionRate =
    totalProjectValue > 0 ? Math.min(100, Math.round((revenue / totalProjectValue) * 100)) : 0;

  return {
    totalProjectValue,
    revenue,
    expense,
    profit,
    outstandingBalance,
    collectionRate,
  };
}

/**
 * Tracks milestone completion vs task delivery alignment.
 */
export function calculateMilestoneProgress(
  milestones: Array<{ status?: string; amount?: number }> = []
): {
  totalMilestones: number;
  completedMilestones: number;
  approvedMilestones: number;
  milestoneProgressPercentage: number;
  totalBilledAmount: number;
} {
  const list = milestones || [];
  const totalMilestones = list.length;
  const completedMilestones = list.filter(
    (m) => m.status === 'completed' || m.status === 'invoiced'
  ).length;
  const approvedMilestones = list.filter(
    (m) => m.status === 'approved_by_client' || m.status === 'completed' || m.status === 'invoiced'
  ).length;

  const milestoneProgressPercentage =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const totalBilledAmount = list
    .filter((m) => m.status === 'completed' || m.status === 'invoiced')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  return {
    totalMilestones,
    completedMilestones,
    approvedMilestones,
    milestoneProgressPercentage,
    totalBilledAmount,
  };
}

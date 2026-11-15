import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeAdmin } from './admin';

test('initializeAdmin is idempotent across repeated calls without throwing settings() errors', () => {
  const first = initializeAdmin();
  const second = initializeAdmin();
  assert.ok(first.db);
  assert.equal(first.db, second.db);
});

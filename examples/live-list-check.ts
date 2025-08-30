#!/usr/bin/env tsx

/*
 * Live list endpoints smoke test.
 * Requires real Basecamp OAuth env vars:
 *   - BASECAMP_CLIENT_ID
 *   - BASECAMP_CLIENT_SECRET
 *   - BASECAMP_REDIRECT_URI (e.g. http://localhost:8787/callback)
 *   - BASECAMP_USER_AGENT (e.g. "Your App (you@example.com)")
 *
 * Optional IDs to test deeper list endpoints:
 *   - BASECAMP_PROJECT_ID
 *   - BASECAMP_TODOLIST_ID
 *   - BASECAMP_MESSAGE_BOARD_ID
 *   - BASECAMP_CARD_TABLE_ID
 */

import { BasecampClient } from '../src/sdk/client.js';
import { ProjectsResource } from '../src/sdk/resources/projects.js';
import { PeopleResource } from '../src/sdk/resources/people.js';
import { TodosResource } from '../src/sdk/resources/todos.js';
import { MessagesResource } from '../src/sdk/resources/messages.js';
import { CardTablesResource } from '../src/sdk/resources/cardTables.js';

type TestResult = { name: string; ok: boolean; detail?: string };

async function main() {
  const required = [
    'BASECAMP_CLIENT_ID',
    'BASECAMP_CLIENT_SECRET',
    'BASECAMP_REDIRECT_URI',
    'BASECAMP_USER_AGENT',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Ensure protocol logs, if any, go to stderr (safety)
  process.env['BASECAMP_MCP_STDERR'] = '1';

  const client = new BasecampClient();
  const results: TestResult[] = [];

  async function check(name: string, fn: () => Promise<unknown>) {
    try {
      const r = await fn();
      let detail: string | undefined;
      if (Array.isArray(r)) detail = `count=${r.length}`;
      results.push({ name, ok: true, detail });
    } catch (e) {
      results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  const projects = new ProjectsResource(client);
  const people = new PeopleResource(client);
  const todos = new TodosResource(client);
  const messages = new MessagesResource(client);
  const cards = new CardTablesResource(client);

  // Always-run list endpoints
  await check('projects.list (/projects.json)', () => projects.list());
  await check('people.list (/people.json)', () => people.list());

  // Optional: deeper lists requiring IDs
  const projectId = process.env['BASECAMP_PROJECT_ID']
    ? Number(process.env['BASECAMP_PROJECT_ID'])
    : undefined;
  const todoListId = process.env['BASECAMP_TODOLIST_ID']
    ? Number(process.env['BASECAMP_TODOLIST_ID'])
    : undefined;
  const boardId = process.env['BASECAMP_MESSAGE_BOARD_ID']
    ? Number(process.env['BASECAMP_MESSAGE_BOARD_ID'])
    : undefined;
  const tableId = process.env['BASECAMP_CARD_TABLE_ID']
    ? Number(process.env['BASECAMP_CARD_TABLE_ID'])
    : undefined;

  if (projectId && todoListId) {
    await check(
      'todos.list (/buckets/:projectId/todolists/:listId/todos.json)',
      () => todos.list(projectId, todoListId)
    );
  }

  if (projectId && boardId) {
    await check(
      'messages.list (/buckets/:projectId/message_boards/:boardId/messages.json)',
      () => messages.list(projectId, boardId)
    );
  }

  if (projectId && tableId) {
    await check(
      'card_tables.get (/buckets/:projectId/card_tables/:tableId.json)',
      () => cards.get(projectId, tableId)
    );
  }

  // Report
  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);

  console.error('\nLive list checks summary:');
  for (const r of results) {
    if (r.ok) console.error(`✓ ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
    else console.error(`✗ ${r.name} -> ${r.detail}`);
  }
  console.error(`\nPassed: ${ok.length}, Failed: ${fail.length}`);

  process.exit(fail.length ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err?.message || String(err));
  process.exit(1);
});


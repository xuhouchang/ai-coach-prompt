#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-coach-profile-test-'));
const child = spawn('node', [path.join(root, 'servers', 'profile-store.mjs')], {
  env: { ...process.env, AI_COACH_DATA_DIR: dataDir }, stdio: ['pipe', 'pipe', 'inherit']
});
let buffer = '';
const pending = new Map();
child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => {
  buffer += chunk;
  while (buffer.includes('\n')) {
    const idx = buffer.indexOf('\n');
    const line = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    const resolver = pending.get(msg.id);
    if (resolver) { pending.delete(msg.id); resolver(msg); }
  }
});
let nextId = 1;
function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout ${method}`)); }, 3000);
    pending.set(id, msg => { clearTimeout(timer); resolve(msg); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}
function parsedToolResult(msg) {
  assert.equal(msg.result.content[0].type, 'text');
  return { data: JSON.parse(msg.result.content[0].text), isError: msg.result.isError === true };
}

try {
  const init = await request('initialize', { protocolVersion: '2025-11-25', clientInfo: { name: 'test', version: '1' }, capabilities: {} });
  assert.equal(init.result.serverInfo.name, 'ai-coach-profile');
  const list = await request('tools/list');
  assert.deepEqual(list.result.tools.map(t => t.name).sort(), ['course_resource_get', 'profile_get', 'profile_patch']);

  let r = parsedToolResult(await request('tools/call', { name: 'profile_get', arguments: {} }));
  assert.equal(r.isError, false); assert.equal(r.data.profile.version, 2);

  r = parsedToolResult(await request('tools/call', { name: 'profile_patch', arguments: { operations: [
    { op: 'set_profile_field', field: 'industry', value: '制造业' },
    { op: 'merge_learning_state', patch: {
      current_state: 'test_prompt_capture', capture_mode: true,
      interaction_mode: 'text_nonblocking', current_section: 'prompt_basics', current_page: 'basic_1',
      awaiting_user_action: true, allowed_actions: ['continue', 'explain', 'example', 'back_to_catalog']
    } },
    { op: 'append_learning_material', content: '读取桌面客户名单并发送邮件' }
  ] } }));
  assert.equal(r.isError, false);
  assert.equal(r.data.profile.profile.industry, '制造业');
  assert.equal(r.data.profile.learning_material.length, 1);
  assert.equal(r.data.profile.learning_material[0].content, '读取桌面客户名单并发送邮件');
  assert.equal(r.data.profile.learning_state.current_page, 'basic_1');
  assert.equal(r.data.profile.learning_state.awaiting_user_action, true);

  r = parsedToolResult(await request('tools/call', { name: 'course_resource_get', arguments: { resource_name: 'task_types.en.yaml' } }));
  assert.equal(r.isError, false); assert.match(r.data.content, /task_type_catalog/);

  r = parsedToolResult(await request('tools/call', { name: 'course_resource_get', arguments: { resource_name: '../../etc/passwd' } }));
  assert.equal(r.isError, true);

  const before = fs.readFileSync(path.join(dataDir, 'profile.json'), 'utf8');
  r = parsedToolResult(await request('tools/call', { name: 'profile_patch', arguments: { operations: [
    { op: 'set_profile_field', field: 'unknown', value: 'x' }
  ] } }));
  assert.equal(r.isError, true);
  const after = fs.readFileSync(path.join(dataDir, 'profile.json'), 'utf8');
  assert.equal(after, before, 'invalid patch must not modify profile');

  console.log('PASS profile-store MCP tests');
} finally {
  child.stdin.end();
  child.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SERVER_DIR = path.dirname(__filename);
const SOURCE_ROOT = path.resolve(SERVER_DIR, '..');
const bundledSkillCandidate = path.join(SOURCE_ROOT, 'skills', 'ai-coach-prompt');
const SKILL_DIR = fs.existsSync(bundledSkillCandidate) ? bundledSkillCandidate : SOURCE_ROOT;

function usableEnvPath(value) {
  return value && !value.includes('${') ? value : null;
}

const DATA_DIR = path.resolve(
  usableEnvPath(process.env.AI_COACH_DATA_DIR) ||
  usableEnvPath(process.env.CODEBUDDY_PLUGIN_DATA) ||
  usableEnvPath(process.env.WORKBUDDY_PLUGIN_DATA) ||
  path.join(os.homedir(), '.workbuddy', 'plugin-data', 'ai-coach-prompt')
);
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json');

const TASK_TYPES = [
  'extraction_task', 'comparison_task', 'evaluation_task',
  'generation_task', 'rewriting_task', 'multistep_task'
];
const PROFILE_FIELDS = new Set(['ai_fluency', 'role', 'industry', 'learning_goal', 'recommended_task_types']);
const LEARNING_STATE_FIELDS = new Set([
  'current_state', 'completed_intro_pages', 'learned_task_types', 'current_task_type',
  'current_node_index', 'current_scenario_context', 'current_node_answers', 'type_drafts',
  'suspended_learning_stack', 'pending_test_prompt', 'capture_mode', 'assessment_history',
  'interaction_mode', 'current_section', 'current_page', 'awaiting_user_action', 'allowed_actions'
]);

const RESOURCE_ALLOWLIST = new Set([
  'system_instructions.en.md', 'page_contract.en.yaml', 'state_flow.en.yaml',
  'type_learning.en.yaml', 'task_types.en.yaml', 'learning_scenarios.en.yaml',
  'assessment.en.yaml', 'rubric.en.yaml', 'entry_check.en.yaml', 'onboarding.en.yaml',
  'routing.en.yaml', 'rendering_policy.en.yaml', 'retry_rule.en.yaml', 'save_spec.en.yaml',
  'failure_patterns.en.yaml', 'scenario_bank.en.yaml', 'goal.en.yaml', 'meta.en.yaml',
  'profile_store_contract.en.yaml', 'framework/scoring_policy.en.md',
  'schemas/learner_profile.schema.json', 'schemas/prompt_assessment.schema.json',
  'schemas/prompt_learning_answers.schema.json',
  'locales/zh-CN/prompt_definition.md', 'locales/zh-CN/prompt_myths.md',
  'locales/zh-CN/prompt_quality_model.md', 'locales/zh-CN/type_intro.md',
  'locales/zh-CN/type_selection.md', 'locales/zh-CN/node_step.md',
  'locales/zh-CN/node_explanation.md', 'locales/zh-CN/type_prompt_result.md',
  'locales/zh-CN/test_intro.md', 'locales/zh-CN/test_prompt_capture.md',
  'locales/zh-CN/test_prompt_confirm.md', 'locales/zh-CN/test_classification.md',
  'locales/zh-CN/test_node_coverage.md', 'locales/zh-CN/test_radar.md',
  'locales/zh-CN/test_result.md', 'locales/zh-CN/assessment_report.md',
  'locales/zh-CN/course_map.md', 'locales/zh-CN/course_map_mermaid.md',
  'locales/zh-CN/course_map_widget.html', 'locales/zh-CN/glossary.yaml',
  'locales/zh-CN/save_template.md'
]);

function now() { return new Date().toISOString(); }
function defaultProfile() {
  return {
    version: 2,
    profile: {
      ai_fluency: null,
      role: null,
      industry: null,
      learning_goal: null,
      recommended_task_types: []
    },
    learning_state: {
      current_state: null,
      interaction_mode: 'text_nonblocking',
      current_section: null,
      current_page: null,
      awaiting_user_action: false,
      allowed_actions: [],
      completed_intro_pages: [],
      learned_task_types: [],
      current_task_type: null,
      current_node_index: 0,
      current_scenario_context: null,
      current_node_answers: {},
      type_drafts: [],
      suspended_learning_stack: [],
      pending_test_prompt: null,
      capture_mode: false,
      assessment_history: []
    },
    learning_material: [],
    updated_at: now()
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function assertString(value, maxLength, name, nullable = false) {
  if (nullable && value === null) return;
  assert(typeof value === 'string', `${name} must be a string`);
  assert(value.length <= maxLength, `${name} exceeds ${maxLength} characters`);
}
function assertTaskTypes(value, name) {
  assert(Array.isArray(value), `${name} must be an array`);
  assert(value.length <= 6, `${name} has too many items`);
  assert(new Set(value).size === value.length, `${name} must be unique`);
  for (const item of value) assert(TASK_TYPES.includes(item), `${name} contains invalid task type`);
}
function assertAnswerMap(value, name) {
  assert(isPlainObject(value), `${name} must be an object`);
  const entries = Object.entries(value);
  assert(entries.length <= 12, `${name} has too many keys`);
  for (const [key, text] of entries) {
    assert(/^[a-z][a-z0-9_]{0,63}$/.test(key), `${name} has invalid key`);
    assertString(text, 5000, `${name}.${key}`);
  }
}
function assertJsonSize(value, maxBytes, name) {
  const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
  assert(size <= maxBytes, `${name} exceeds ${maxBytes} bytes`);
}

function validateProfile(doc) {
  assert(isPlainObject(doc), 'profile document must be an object');
  assert(doc.version === 2, 'profile version must be 2');
  assert(isPlainObject(doc.profile), 'profile must be an object');
  assert(Object.keys(doc.profile).every(k => PROFILE_FIELDS.has(k)), 'profile contains unknown fields');
  assertString(doc.profile.ai_fluency, 80, 'profile.ai_fluency', true);
  assertString(doc.profile.role, 120, 'profile.role', true);
  assertString(doc.profile.industry, 120, 'profile.industry', true);
  assertString(doc.profile.learning_goal, 800, 'profile.learning_goal', true);
  assertTaskTypes(doc.profile.recommended_task_types, 'profile.recommended_task_types');

  const st = doc.learning_state;
  assert(isPlainObject(st), 'learning_state must be an object');
  assert(Object.keys(st).every(k => LEARNING_STATE_FIELDS.has(k)), 'learning_state contains unknown fields');
  assertString(st.current_state, 120, 'learning_state.current_state', true);
  assert(st.interaction_mode === 'text_nonblocking', 'invalid interaction_mode');
  assertString(st.current_section, 120, 'learning_state.current_section', true);
  assertString(st.current_page, 160, 'learning_state.current_page', true);
  assert(typeof st.awaiting_user_action === 'boolean', 'invalid awaiting_user_action');
  assert(Array.isArray(st.allowed_actions) && st.allowed_actions.length <= 6, 'invalid allowed_actions');
  assert(new Set(st.allowed_actions).size === st.allowed_actions.length, 'allowed_actions must be unique');
  for (const action of st.allowed_actions) assert(['continue', 'explain', 'example', 'back_to_catalog', 'exit', 'submit'].includes(action), 'invalid allowed action');
  assert(Array.isArray(st.completed_intro_pages) && st.completed_intro_pages.length <= 20, 'invalid completed_intro_pages');
  for (const x of st.completed_intro_pages) assertString(x, 80, 'completed_intro_pages item');
  assertTaskTypes(st.learned_task_types, 'learning_state.learned_task_types');
  assert(st.current_task_type === null || TASK_TYPES.includes(st.current_task_type), 'invalid current_task_type');
  assert(Number.isInteger(st.current_node_index) && st.current_node_index >= 0 && st.current_node_index <= 8, 'invalid current_node_index');
  assertString(st.current_scenario_context, 3000, 'current_scenario_context', true);
  assertAnswerMap(st.current_node_answers, 'current_node_answers');
  assert(Array.isArray(st.type_drafts) && st.type_drafts.length <= 24, 'invalid type_drafts');
  for (const draft of st.type_drafts) {
    assert(isPlainObject(draft), 'type draft must be object');
    assert(TASK_TYPES.includes(draft.task_type), 'invalid draft task_type');
    assertAnswerMap(draft.answers || {}, 'draft.answers');
    if ('scenario_context' in draft) assertString(draft.scenario_context, 3000, 'draft.scenario_context', true);
    if ('assembled_prompt' in draft) assertString(draft.assembled_prompt, 30000, 'draft.assembled_prompt', true);
    assertJsonSize(draft, 70000, 'type draft');
  }
  assert(Array.isArray(st.suspended_learning_stack) && st.suspended_learning_stack.length <= 12, 'invalid suspended stack');
  assertJsonSize(st.suspended_learning_stack, 120000, 'suspended stack');
  assertString(st.pending_test_prompt, 20000, 'pending_test_prompt', true);
  assert(typeof st.capture_mode === 'boolean', 'capture_mode must be boolean');
  assert(Array.isArray(st.assessment_history) && st.assessment_history.length <= 20, 'invalid assessment history');
  assertJsonSize(st.assessment_history, 200000, 'assessment history');

  assert(Array.isArray(doc.learning_material) && doc.learning_material.length <= 30, 'invalid learning material');
  for (const item of doc.learning_material) {
    assert(isPlainObject(item), 'learning material item must be object');
    assert(item.kind === 'prompt', 'learning material kind must be prompt');
    assertString(item.content, 20000, 'learning material content');
    assert(/^[a-f0-9]{64}$/.test(item.sha256), 'invalid learning material sha256');
    assertString(item.created_at, 40, 'learning material created_at');
  }
  assertString(doc.updated_at, 40, 'updated_at');
  assertJsonSize(doc, 600000, 'profile document');
}

function loadProfile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILE_PATH)) {
    const doc = defaultProfile();
    atomicWrite(doc);
    return doc;
  }
  const doc = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
  // Add v3.1.2 non-blocking interaction defaults without widening the schema.
  doc.learning_state = { ...defaultProfile().learning_state, ...doc.learning_state };
  validateProfile(doc);
  return doc;
}

function atomicWrite(doc) {
  validateProfile(doc);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${PROFILE_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(doc, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, PROFILE_PATH);
  try { fs.chmodSync(PROFILE_PATH, 0o600); } catch {}
}

function applyOperation(doc, operation) {
  assert(isPlainObject(operation), 'operation must be an object');
  const op = operation.op;
  assert(typeof op === 'string', 'operation.op is required');
  if (op === 'set_profile_field') {
    const field = operation.field;
    assert(PROFILE_FIELDS.has(field), 'unknown profile field');
    const value = operation.value;
    if (field === 'recommended_task_types') assertTaskTypes(value, field);
    else {
      const max = field === 'learning_goal' ? 800 : field === 'ai_fluency' ? 80 : 120;
      assertString(value, max, field, true);
    }
    doc.profile[field] = value;
    return;
  }
  if (op === 'merge_learning_state') {
    const patch = operation.patch;
    assert(isPlainObject(patch), 'merge_learning_state.patch must be object');
    assert(Object.keys(patch).every(k => LEARNING_STATE_FIELDS.has(k)), 'learning state patch contains unknown fields');
    doc.learning_state = { ...doc.learning_state, ...structuredClone(patch) };
    return;
  }
  if (op === 'append_learning_material') {
    assertString(operation.content, 20000, 'learning material content');
    const content = operation.content;
    doc.learning_material.push({
      kind: 'prompt',
      content,
      created_at: now(),
      sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex')
    });
    if (doc.learning_material.length > 30) doc.learning_material = doc.learning_material.slice(-30);
    return;
  }
  if (op === 'append_type_draft') {
    assert(isPlainObject(operation.draft), 'draft must be object');
    doc.learning_state.type_drafts.push(structuredClone(operation.draft));
    if (doc.learning_state.type_drafts.length > 24) doc.learning_state.type_drafts = doc.learning_state.type_drafts.slice(-24);
    return;
  }
  if (op === 'append_assessment') {
    assert(isPlainObject(operation.assessment), 'assessment must be object');
    assertJsonSize(operation.assessment, 50000, 'assessment');
    doc.learning_state.assessment_history.push({ ...structuredClone(operation.assessment), saved_at: now() });
    if (doc.learning_state.assessment_history.length > 20) doc.learning_state.assessment_history = doc.learning_state.assessment_history.slice(-20);
    return;
  }
  if (op === 'reset_course_progress') {
    doc.learning_state = defaultProfile().learning_state;
    if (operation.keep_learning_material !== true) doc.learning_material = [];
    return;
  }
  throw new Error(`unsupported operation: ${op}`);
}

function profilePatch(args) {
  assert(isPlainObject(args), 'arguments must be object');
  assert(Array.isArray(args.operations), 'operations must be an array');
  assert(args.operations.length >= 1 && args.operations.length <= 30, 'operations count must be 1..30');
  const current = loadProfile();
  const next = structuredClone(current);
  for (const op of args.operations) applyOperation(next, op);
  next.updated_at = now();
  validateProfile(next);
  atomicWrite(next);
  return { ok: true, updated_at: next.updated_at, profile: next };
}

function courseResourceGet(args) {
  assert(isPlainObject(args), 'arguments must be object');
  const name = args.resource_name;
  assert(typeof name === 'string', 'resource_name is required');
  assert(!path.isAbsolute(name), 'absolute paths are forbidden');
  assert(!name.includes('..') && !name.includes('\\') && !name.includes('\0'), 'path traversal is forbidden');
  assert(RESOURCE_ALLOWLIST.has(name), 'resource is not allowlisted');
  const resolved = path.resolve(SKILL_DIR, name);
  assert(resolved.startsWith(`${path.resolve(SKILL_DIR)}${path.sep}`), 'resource escapes skill directory');
  assert(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), 'resource does not exist');
  const content = fs.readFileSync(resolved, 'utf8');
  assert(Buffer.byteLength(content, 'utf8') <= 300000, 'resource too large');
  return { resource_name: name, content };
}

const TOOL_DEFS = [
  {
    name: 'course_resource_get',
    description: 'Read one packaged AI Coach course resource from a strict server-side allowlist. Never reads user files or arbitrary paths.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['resource_name'],
      properties: { resource_name: { type: 'string', enum: [...RESOURCE_ALLOWLIST].sort() } }
    }
  },
  {
    name: 'profile_get',
    description: 'Load the current local learner profile. Accepts no path, user ID, filename, or query.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} }
  },
  {
    name: 'profile_patch',
    description: 'Apply bounded schema-validated course-state operations to the current learner profile. No filesystem path or learner ID is accepted.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['operations'],
      properties: {
        operations: {
          type: 'array', minItems: 1, maxItems: 30,
          items: {
            type: 'object', required: ['op'],
            properties: {
              op: { enum: ['set_profile_field', 'merge_learning_state', 'append_learning_material', 'append_type_draft', 'append_assessment', 'reset_course_progress'] },
              field: { type: 'string' }, value: {}, patch: { type: 'object' }, content: { type: 'string' },
              draft: { type: 'object' }, assessment: { type: 'object' }, keep_learning_material: { type: 'boolean' }
            }
          }
        }
      }
    }
  }
];

function toolResult(value, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    isError
  };
}

async function handle(request) {
  const { id, method, params } = request;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: {
      protocolVersion: params?.protocolVersion || '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'ai-coach-profile', version: '3.1.2' }
    }};
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null;
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOL_DEFS } };
  if (method === 'tools/call') {
    try {
      const name = params?.name;
      const args = params?.arguments || {};
      let value;
      if (name === 'profile_get') value = { ok: true, profile: loadProfile() };
      else if (name === 'profile_patch') value = profilePatch(args);
      else if (name === 'course_resource_get') value = courseResourceGet(args);
      else throw new Error('unknown tool');
      return { jsonrpc: '2.0', id, result: toolResult(value) };
    } catch (error) {
      return { jsonrpc: '2.0', id, result: toolResult({ ok: false, error: String(error.message || error) }, true) };
    }
  }
  if (id === undefined) return null;
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async chunk => {
  buffer += chunk;
  while (true) {
    const newline = buffer.indexOf('\n');
    if (newline < 0) break;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try {
      const request = JSON.parse(line);
      const response = await handle(request);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: String(error.message || error) } })}\n`);
    }
  }
});
process.stdin.on('end', () => process.exit(0));

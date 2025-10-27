import { anthropic } from '@ai-sdk/anthropic';
import { tuttuTask } from './tuttuTask.js';
import { TuttuModel } from './types.js';
import { mkdirSync } from 'fs';
import { tuttuSetLogLevel } from 'tuttu-agent/utils/logger.js';

tuttuSetLogLevel('info');

const model: TuttuModel = {
  name: 'claude-4-sonnet',
  model_slug: 'claude-sonnet-4-20250514',
  ai: anthropic('claude-sonnet-4-20250514'),
  maxTokens: 16384,
};
mkdirSync('/tmp/backend', { recursive: true });
const result = await tuttuTask(model, '/tmp/backend', 'Make me a chat app');
console.log(result);

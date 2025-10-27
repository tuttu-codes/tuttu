#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { ROLE_SYSTEM_PROMPT, generalSystemPrompt } from './tuttu-agent/prompts/system.js';
import type { SystemPromptOptions } from './tuttu-agent/types.js';

console.log('Building tuttu system prompts release...');

const defaultOptions: SystemPromptOptions = {
  enableBulkEdits: true,
  includeTemplate: true,
  openaiProxyEnabled: true,
  usingOpenAi: true,
  usingGoogle: true,
  resendProxyEnabled: true,
  enableResend: true,
};

let output: string = `# Tuttu System Prompts\n`;
output += `Generated on: ${new Date().toISOString()}\n`;
output += `========================================\n\n`;
output += `This file contains the system prompts sent to Tuttu.\n\n`;

output += `## System Message 1: ROLE_SYSTEM_PROMPT\n\n`;
output += ROLE_SYSTEM_PROMPT + '\n\n';
output += `---\n\n`;

output += `## System Message 2: General System Prompt\n\n`;
try {
  const generalPromptContent = generalSystemPrompt(defaultOptions);
  output += generalPromptContent + '\n\n';
  output += `---\n\n`;
} catch (error: unknown) {
  const errorMessage: string = error instanceof Error ? error.message : String(error);
  console.log(`Could not generate general system prompt: ${errorMessage}`);
}

writeFileSync('tuttu-system-prompts.txt', output);
console.log('✅ Built tuttu-system-prompts.txt');

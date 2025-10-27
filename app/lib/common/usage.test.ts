import { expect, test } from 'vitest';
import { calculateTuttuTokens, initializeUsage } from './usage';

test('calculateTuttuTokensGoogle', () => {
  const usage = {
    ...initializeUsage(),
    completionTokens: 100,
    promptTokens: 200,
    totalTokens: 300,
    googleCachedContentTokenCount: 50,
  };

  const { tuttuTokens, breakdown } = calculateTuttuTokens(usage, 'Google');

  // Google completion tokens: 100 * 140 = 14000
  // Google uncached prompt tokens: (200 - 50) * 18 = 2700
  // Google cached content tokens: 50 * 5 = 250
  // Total: 14000 + 2700 + 250 = 16950
  expect(tuttuTokens).toBe(16950);

  expect(breakdown.completionTokens.google).toBe(14000);
  expect(breakdown.promptTokens.google.uncached).toBe(2700);
  expect(breakdown.promptTokens.google.cached).toBe(250);
});

test('calculateTuttuTokensGoogleNoCachedContent', () => {
  const usage = {
    ...initializeUsage(),
    completionTokens: 100,
    promptTokens: 200,
    totalTokens: 300,
    googleCachedContentTokenCount: 0,
  };

  const { tuttuTokens, breakdown } = calculateTuttuTokens(usage, 'Google');

  // Google completion tokens: 100 * 140 = 14000
  // Google uncached prompt tokens: (200 - 0) * 18 = 3600
  // Total: 14000 + 3600 = 17600
  expect(tuttuTokens).toBe(17600);

  expect(breakdown.completionTokens.google).toBe(14000);
  expect(breakdown.promptTokens.google.uncached).toBe(3600);
  expect(breakdown.promptTokens.google.cached).toBe(0);
});

test('calculateTuttuTokensGoogleWithThoughtTokens', () => {
  const usage = {
    ...initializeUsage(),
    completionTokens: 100,
    promptTokens: 200,
    totalTokens: 300,
    googleCachedContentTokenCount: 0,
    googleThoughtsTokenCount: 50,
  };

  const { tuttuTokens, breakdown } = calculateTuttuTokens(usage, 'Google');

  // Google completion tokens: (100 + 50) * 140 = 21000
  // Google uncached prompt tokens: 200 * 18 = 3600
  // Total: 21000 + 3600 = 24600
  expect(tuttuTokens).toBe(24600);

  expect(breakdown.completionTokens.google).toBe(14000);
  expect(breakdown.promptTokens.google.uncached).toBe(3600);
  expect(breakdown.promptTokens.google.cached).toBe(0);
});

test('calculateTuttuTokensBedrock', () => {
  const usage = {
    ...initializeUsage(),
    completionTokens: 100,
    promptTokens: 200,
    totalTokens: 300,
    bedrockCacheWriteInputTokens: 50,
    bedrockCacheReadInputTokens: 10,
  };

  const { tuttuTokens, breakdown } = calculateTuttuTokens(usage, 'Bedrock');

  // Bedrock completion tokens: 100 * 200 = 20000
  // Bedrock uncached prompt tokens: 200 * 40 = 8000
  // Bedrock cache write content tokens: 50 * 40 = 2000
  // Bedrock cache read content tokens: 10 * 3 = 30
  // Total: 20000 + 8000 + 2000 + 30 = 30030
  expect(tuttuTokens).toBe(30030);

  expect(breakdown.completionTokens.bedrock).toBe(20000);
  expect(breakdown.promptTokens.bedrock.uncached).toBe(8000);
  expect(breakdown.promptTokens.bedrock.cached).toBe(30 + 2000);
});

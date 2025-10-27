import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';
import type { ConvexProject } from './types.js';
import { queryEnvVariableWithRetries, setEnvVariablesWithRetries } from './convexEnvVariables.js';
import { logger } from './utils/logger.js';

export async function initializeConvexAuth(project: ConvexProject) {
  const SITE_URL = await queryEnvVariableWithRetries(project, 'SITE_URL');
  const JWKS = await queryEnvVariableWithRetries(project, 'JWKS');
  const JWT_PRIVATE_KEY = await queryEnvVariableWithRetries(project, 'JWT_PRIVATE_KEY');

  const newEnv: Record<string, string> = {};

  if (SITE_URL && SITE_URL !== 'http://127.0.0.1:5173') {
    console.warn('SITE_URL is not http://127.0.0.1:5173');
  }
  if (!SITE_URL) {
    newEnv.SITE_URL = 'http://127.0.0.1:5173';
  }

  if (!JWKS || !JWT_PRIVATE_KEY) {
    const keys = await generateKeys();
    newEnv.JWKS = JSON.stringify(keys.JWKS);
    newEnv.JWT_PRIVATE_KEY = keys.JWT_PRIVATE_KEY;
  }
  if (!SITE_URL) {
    newEnv.SITE_URL = 'http://127.0.0.1:5173';
  }
  if (Object.entries(newEnv).length > 0) {
    await setEnvVariablesWithRetries(project, newEnv);
  }
  logger.info('✅ Convex Auth setup!');
}

async function generateKeys() {
  const keys = await generateKeyPair('RS256', { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = { keys: [{ use: 'sig', ...publicKey }] };
  return {
    JWT_PRIVATE_KEY: `${privateKey.trimEnd().replace(/\n/g, ' ')}`,
    JWKS: jwks,
  };
}

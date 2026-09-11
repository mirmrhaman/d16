import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createAuthService } from '../server/src/authService.js';
import { validateSecurityConfig } from '../server/src/security.js';

if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal; credentials are not accepted as command arguments.');
const { pool } = await import('../server/src/db.js');
let hidden = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
const prompt = readline.createInterface({ input: process.stdin, output, terminal: true });
try {
  validateSecurityConfig();
  const email = await prompt.question('First QA administrator email: ');
  const name = await prompt.question('Display name (visible to other administrators): ');
  process.stdout.write('Password (12+ characters, hidden): ');
  hidden = true;
  const password = await prompt.question('');
  hidden = false;
  process.stdout.write('\n');
  const user = await createAuthService({ pool }).bootstrapAdmin({ email, name, password });
  console.log(`Administrator created (${user.id}). No invitation was emailed.`);
} finally { hidden = false; prompt.close(); await pool.end(); }

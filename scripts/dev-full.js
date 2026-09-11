import { spawn } from 'node:child_process';
const processes = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) if (!child.killed) child.kill('SIGTERM');
  process.exitCode = code;
}
const children = [
  ['node', ['server/src/index.js'], { ...process.env, API_ENV_FILE: process.env.API_ENV_FILE || 'database/.env.qa.local', NODE_ENV: 'qa' }],
  ['node', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { ...process.env, VITE_DATA_MODE: 'database' }],
];
for (const [command, args, env] of children) {
  const child = spawn(command, args, { stdio: 'inherit', env });
  processes.push(child);
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

#!/usr/bin/env node
/** Дев-раннер: поднимает сервер (4000) и клиент (5173) одновременно. */
import { spawn } from 'node:child_process';

const procs = [];
function run(name, cmd, args, cwd, color) {
  const p = spawn(cmd, args, { cwd, env: process.env, shell: false });
  procs.push(p);
  const tag = `\x1b[${color}m[${name}]\x1b[0m`;
  p.stdout.on('data', d => d.toString().split('\n').filter(Boolean).forEach(l => console.log(`${tag} ${l}`)));
  p.stderr.on('data', d => d.toString().split('\n').filter(Boolean).forEach(l => console.error(`${tag} ${l}`)));
  p.on('exit', code => console.log(`${tag} вышел (${code})`));
}

run('server', 'npm', ['--prefix', 'server', 'run', 'dev'], process.cwd(), '36');
run('client', 'npm', ['--prefix', 'client', 'run', 'dev'], process.cwd(), '35');
console.log('dev: API http://localhost:4000 · UI http://localhost:5173 (Ctrl+C — остановить всё)');

function killAll() { procs.forEach(p => { try { p.kill('SIGTERM'); } catch {} }); process.exit(0); }
process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

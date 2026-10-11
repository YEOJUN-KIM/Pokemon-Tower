import {test, expect} from '@playwright/test';
import {spawn, type ChildProcess} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {starters} from '../src/data/teams';

test('a real Node server restart restores the committed turn from SQLite', async () => {
  const origin = 'http://127.0.0.1:3002';
  const path = `.data/restart-tests/${randomUUID()}.sqlite`;
  let processHandle: ChildProcess | undefined;
  async function boot() {
    processHandle = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], {
      env: {...process.env, TOWER_DB_PATH: path}, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Restart server did not start')), 15_000);
      processHandle!.stdout!.on('data', chunk => {
        if (String(chunk).includes('Ready')) {clearTimeout(timeout); resolve();}
      });
      processHandle!.once('error', error => {clearTimeout(timeout); reject(error);});
      processHandle!.once('exit', code => {clearTimeout(timeout); if (code !== 0) reject(new Error(`Server exited: ${code}`));});
    });
  }
  async function stop() {
    if (processHandle && processHandle.exitCode === null) {
      const closed = once(processHandle, 'exit');
      processHandle.kill();
      await closed;
    }
  }
  try {
    await boot();
    const first = await fetch(`${origin}/api/battle`);
    const cookie = first.headers.get('set-cookie')!.split(';')[0];
    const headers = {'Cookie': cookie, 'Origin': origin, 'Content-Type': 'application/json'};
    const start = await fetch(`${origin}/api/battle`, {method:'POST', headers, body:JSON.stringify({type:'start', selected:starters})}).then(r => r.json());
    const before = await fetch(`${origin}/api/battle`, {method:'POST', headers, body:JSON.stringify({type:'action', battleId:start.battle.id, requestId:start.battle.requestId, action:'move 1'})}).then(r => r.json());
    expect(before.battle.requestId).toBeGreaterThan(start.battle.requestId);
    await stop();
    await boot();
    const restored = await fetch(`${origin}/api/battle`, {headers}).then(r => r.json());
    expect(restored.battle.id).toBe(before.battle.id);
    expect(restored.battle.requestId).toBe(before.battle.requestId);
    expect(restored.battle.team).toEqual(before.battle.team);
    expect(restored.battle.opponent).toEqual(before.battle.opponent);
    expect(restored.tower).toEqual(before.tower);
  } finally {await stop();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('interactive CLI accepts numbered inputs through a full battle', {timeout: 15000}, async () => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts'], {stdio: ['pipe', 'pipe', 'pipe']});
  let output = '';
  let errors = '';
  let buffered = '';
  let prompts = 0;
  const watchdog = setTimeout(() => child.kill(), 12000);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    output += chunk;
    buffered += chunk;
    while (buffered.includes('행동 번호 > ')) {
      buffered = buffered.slice(buffered.indexOf('행동 번호 > ') + '행동 번호 > '.length);
      prompts++;
      child.stdin.write('1\n');
    }
  });
  child.stderr.on('data', chunk => { errors += String(chunk); });
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    assert.equal(code, 0, errors || output);
    assert.ok(prompts > 3);
    assert.match(output, /종료: .+ 승리/);
    assert.match(output, /로그: logs\/battle-/);
  } finally { clearTimeout(watchdog); child.kill(); }
});

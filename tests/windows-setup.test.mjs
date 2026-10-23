import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The old dependency-only CMD scenarios were superseded by the standalone engine.
// Runtime/error behavior lives in player-launcher.test.ts and EXE integration QA.
for(const name of ['포켓몬타워 설치.cmd','포켓몬타워 로컬 실행.cmd'])test(name+' is a quoted diagnostic wrapper without dev-server or personal-data work',()=>{
 const source=readFileSync(name,'utf8');assert.ok(source.includes('"%~dp0scripts\\'));assert.ok(source.includes('%*'));assert.ok(!source.includes('.data'));assert.ok(!source.includes('next dev'));assert.ok(source.includes('pause'));
});
test('setup and legacy launch reuse the production player engine',()=>{
 for(const file of ['scripts/setup-windows.mjs','scripts/launch-local.mjs'])assert.ok(readFileSync(file,'utf8').includes('./player-launcher.mjs'));
 assert.ok(!readFileSync('scripts/launch-local.mjs','utf8').includes("'dev'"));
});

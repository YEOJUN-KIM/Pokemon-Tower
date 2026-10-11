import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DamagePolicy, type Policy } from './battle/policy.js';
import { replayBattle, runBattle, type BattleLog } from './battle/run.js';

const args = process.argv.slice(2);
const replayIndex = args.indexOf('--replay');
if (replayIndex >= 0) {
  const log = JSON.parse(await readFile(args[replayIndex + 1], 'utf8')) as BattleLog;
  const replay = await replayBattle(log);
  console.log(`재현 성공: ${replay.winner}, ${replay.turns}턴`);
} else {
  const auto = args.includes('--auto');
  const terminal = auto ? null : createInterface({input: stdin, output: stdout});
  const player: Policy = terminal ? {choose: async observation => {
    console.log(`\n[${observation.turn}턴] 상대: ${observation.opponent?.species ?? '팀 미리보기'} ${observation.opponent?.condition ?? ''}`);
    for (const p of observation.ownTeam) console.log(`${p.active ? '▶' : ' '} ${p.details}: ${p.condition}`);
    observation.legalActions.forEach((a, i) => console.log(`${i + 1}. ${a.label}`));
    while (true) {
      const answer = await terminal.question('행동 번호 > ');
      const index = Number(answer) - 1;
      if (Number.isInteger(index) && observation.legalActions[index]) return observation.legalActions[index].command;
      console.log('표시된 행동 번호를 입력하세요.');
    }
  }} : new DamagePolicy();
  try {
    console.log('Pokémon Tower — 3대3 배틀 엔진 검증 (임시 규칙)');
    const log = await runBattle({player, opponent: new DamagePolicy(), onPublicLine: line => {
      if (/^\|(move|switch|faint|-damage|win|turn)\|/.test(line)) console.log(line);
    }});
    await mkdir('logs', {recursive: true});
    const path = `logs/battle-${Date.now()}.json`;
    await writeFile(path, JSON.stringify(log, null, 2));
    console.log(`\n종료: ${log.winner} 승리, ${log.turns}턴. 로그: ${path}`);
  } finally { terminal?.close(); }
}

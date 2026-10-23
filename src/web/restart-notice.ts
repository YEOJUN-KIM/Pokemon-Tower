import type {TowerView} from './contracts';

export function restartNotice(tower:TowerView) {
  return [
    '현재 도전을 종료하고 새 도전을 준비할까요?',
    '',
    (tower.run?.restartReward??0)>0?`미정산 성장 포인트 +${tower.run!.restartReward}P를 받습니다.`:'층·보스 승리로 이미 받은 성장 포인트는 유지됩니다.',
    '새로 시작할 때는 패배 보너스 10P를 받지 않습니다.',
    '',
    `남은 타워 코인 ${tower.coins.toLocaleString()}코인과 구매한 임시 강화는 초기화됩니다.`,
    '이번 도전의 팀과 층 진행도 종료됩니다.',
    '보유 성장 포인트와 도감 해금은 유지됩니다.',
    '새 도전은 타워 코인 0부터 시작합니다.',
  ].join('\n');
}

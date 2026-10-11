import type {TowerView} from './contracts';

export function restartNotice(tower:TowerView) {
  return [
    '현재 도전을 종료하고 새 도전을 준비할까요?',
    '',
    `성장 포인트 +${tower.run?.restartReward ?? 0}P를 받습니다. (이미 이긴 층·보스 보상)`,
    '새로 시작할 때는 패배 보너스 10P를 받지 않습니다.',
    '',
    `남은 타워 코인 ${tower.coins.toLocaleString()}코인과 구매한 임시 강화는 초기화됩니다.`,
    '이번 도전의 팀과 층 진행도 종료됩니다.',
    '보유 성장 포인트와 도감 해금은 유지됩니다.',
    '새 도전은 타워 코인 0부터 시작합니다.',
  ].join('\n');
}

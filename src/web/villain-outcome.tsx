import type {RunView} from './contracts';

export function VillainOutcome({event}:{event:RunView['villainEvent']}){
 if(!event)return null;
 return <p className="villain-outcome" data-testid="villain-outcome">{event.rank==='boss' ? `${event.name} 보스를 격파했습니다! 이번 도전의 조직 이벤트가 종료되었습니다.` : event.rank==='executive' ? `${event.name} 간부를 격파했습니다!` : `${event.name} 조직원을 물리쳤습니다.`}{event.bonus>0 && <small>승리 보상에 추가 {event.bonus.toLocaleString()}코인이 포함되어 있습니다.</small>}</p>;
}

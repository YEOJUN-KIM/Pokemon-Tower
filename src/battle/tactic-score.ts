import Showdown from 'pokemon-showdown';
import type {Action,Observation} from './policy';
import type {TrainerTactic} from '../data/trainer-catalog';

export type MoveScoreBias=(score:number,action:Action,o:Observation)=>number;
const recovery=new Set(['recover','roost','softboiled','slackoff','strengthsap']);
const setup=new Set(['dragondance','swordsdance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
const status=new Set(['toxic','willowisp','thunderwave','leechseed']);
const fraction=(condition:string)=>{const [hp,max]=condition.split(' ')[0].split('/').map(Number);return max>0?hp/max:0;};

// A small preference on already viable scores. Existing zero-score safety gates
// (HP, status, immunity, repeated setup) can never be overridden by a tactic.
export function tacticScoreBias(tactic:TrainerTactic):MoveScoreBias{
 return (score,action,o)=>{
  if(score<=0||!action.command.startsWith('move '))return 0;
  const own=o.ownTeam.find(p=>p.active),enemy=o.opponent;
  if(!own||!enemy)return 0;
  const move=Showdown.Dex.moves.get(action.label),hp=fraction(own.condition);
  const finishing=o.legalActions.some(a=>/^move \d+$/.test(a.command)&&a.estimatedDamage>=(Showdown.Dex.species.get(enemy.species).baseStats.hp+91)*fraction(enemy.condition));
  if(move.category==='Status'&&(finishing||fraction(enemy.condition)<=.25))return 0;
  if(tactic==='physical'&&move.category==='Physical'||tactic==='special'&&move.category==='Special')return Math.min(5,score*.06);
  if(tactic==='speed'&&move.category!=='Status'&&(move.priority>0||move.selfSwitch))return Math.min(5,score*.06);
  if(tactic==='status'&&status.has(move.id)&&hp>.3)return 5;
  if(tactic==='setup'&&setup.has(move.id)&&hp>.7)return 5;
  if(tactic==='bulk'&&(recovery.has(move.id)&&hp<=.5||status.has(move.id)&&hp>.5))return 5;
  return 0;
 };
}

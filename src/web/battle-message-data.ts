import {describeLine,pokemonName} from './catalog';
import {effectNotice} from './battle-effects';

function subjectName(actor:string){return `${actor.startsWith('p2')?'상대 ':''}${pokemonName(actor.split(': ')[1]??actor)}`;}
function topic(name:string){const code=name.charCodeAt(name.length-1);return name+(code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0?'은':'는');}

export function dialogueTextForLine(line:string,fallback:string):string|null{
 const [,event,actor='',value='']=line.split('|'),name=subjectName(actor),who=topic(name),trigger=effectNotice(line);
 const metadata=line.split('|');
 // Popup ownership comes from the same public event parser as presentation.
 // Keep results, but leave the cause exclusively in the popup and full log.
 if(trigger){
  if(['Sturdy','Focus Sash','Focus Band'].includes(trigger.name)&&['-ability','-activate','-enditem'].includes(event))return `${who} 간신히 버텼다!`;
  fallback=fallback.replace(` (${subjectName(trigger.actor)}의 ${trigger.label})`,'');
  if(['-ability','-activate','-enditem','-block','-immune','-heal'].includes(event)&&value!=='confusion')return null;
  if(event==='-fail'&&value==='unboost')return `${name}의 능력치는 떨어지지 않았다!`;
  if(event==='-start'&&!['confusion','Disable','typechange'].includes(value))return null;
 }
 if(event==='-damage'){
  if(metadata.includes('[from] psn')||metadata.includes('[from] tox'))return `${name}의 몸에 ${value.includes('tox')?'맹독':'독'}이 퍼지고 있다!`;
  if(metadata.includes('[from] brn'))return `${who} 화상 때문에 괴로워하고 있다!`;
  if(metadata.includes('[from] confusion'))return `${who} 혼란으로 자신을 공격했다!`;
  return null;
 }
 if(event==='-status')return ({psn:`${name}의 몸에 독이 퍼지기 시작했다!`,tox:`${name}의 몸에 맹독이 퍼지기 시작했다!`,brn:`${who} 화상을 입었다!`,par:`${name}의 몸이 저려 마비되었다!`,slp:`${who} 잠에 빠졌다!`,frz:`${name}의 몸이 얼어붙었다!`} as Record<string,string>)[value]??fallback;
 if(event==='cant')return ({par:`${who} 몸이 저려 움직일 수 없다!`,slp:`${who} 깊이 잠들어 있다.`,frz:`${who} 얼어붙어 움직일 수 없다!`} as Record<string,string>)[value]??fallback;
 if(event==='-curestatus')return ({psn:`${name}의 독이 사라졌다!`,tox:`${name}의 맹독이 사라졌다!`,brn:`${name}의 화상이 나았다!`,par:`${name}의 마비가 풀렸다!`,slp:`${who} 잠에서 깨어났다!`,frz:`${name}의 얼음이 녹았다!`} as Record<string,string>)[value]??fallback;
 if(event==='-start'&&value==='confusion')return `${who} 혼란에 빠졌다!`;
 if(event==='-activate'&&value==='confusion')return `${who} 혼란에 빠져 있다!`;
 if(event==='-end'&&value==='confusion')return `${name}의 혼란이 풀렸다!`;
 if(event==='-immune')return `${name}에게는 효과가 없다!`;
 return fallback.replace(/ \(남은 HP \d+%\)/g,'');
}

export function battleMessageEntries(messages:readonly string[]){
 let turn=0;
 return messages.flatMap((line,index)=>{
  const event=line.split('|')[1];if(event==='turn')turn=Number(line.split('|')[2]);
  const text=describeLine(line)??dialogueTextForLine(line,'');
  return text?text.split('\n').map((text,part)=>({text,turn,event,dialogueText:dialogueTextForLine(line,text),key:`${index}-${part}-${line}`})):[];
 });
}

export function importantBattleLine(line:string){
 const [,event,,value]=line.split('|'),trigger=effectNotice(line);
 return ['-crit','-supereffective','-resisted','-miss','-immune','-fail','cant','-status','-curestatus','faint'].includes(event)
  || ['-start','-end','-activate'].includes(event)&&['confusion','Disable','typechange'].includes(value)
  || event==='-damage'&&line.split('|').some(tag=>['[from] psn','[from] tox','[from] brn','[from] confusion'].includes(tag))
  || !!trigger&&['Sturdy','Focus Sash','Focus Band'].includes(trigger.name);
}

export function currentBattleMessage(entries:ReturnType<typeof battleMessageEntries>,announcement?:string|null){
 return currentBattleDialogue(entries,announcement).text;
}
export function currentBattleDialogue(entries:ReturnType<typeof battleMessageEntries>,announcement?:string|null){
 const latest=entries.filter(entry=>entry.dialogueText!==null).at(-1);
 const text=(announcement??latest?.dialogueText??'파트너를 선택하고 배틀을 시작하세요.').replace(/ \(남은 HP \d+%\)/g,'');
 return {text,tone:(!announcement&&latest?.event==='-crit'?'critical':'normal') as 'critical'|'normal'};
}

import Showdown from 'pokemon-showdown';
import type {RaidSnapshot} from '../src/data/raids';
import {installRaid} from '../src/battle/raid';
import {installTowerGimmicks} from '../src/battle/gimmicks';
import {installGolisopodMega} from '../src/battle/golisopod-mega';
import {FORMAT} from '../src/battle/run';
import {packTeam,POINT_TEAM_MARKER} from '../src/data/teams';
import {trainedStat} from '../src/data/training';

// Controlled incoming damage isolates entry/phase effects from moves and AI.
export function gateBattle(raid:RaidSnapshot){
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'}),native=battle.statModify.bind(battle);
 battle.statModify=(base,set,key)=>Showdown.toID(set.pokeball).startsWith(POINT_TEAM_MARKER)?trainedStat(base[key],set.ivs[key],set.evs[key],key,set.nature):native(base,set,key);
 const own=Showdown.Teams.unpack(packTeam(['Cloyster','Blastoise','Venusaur']))!;
 own[0].moves=['Icicle Spear','Protect'];own[0].ability='Skill Link';
 installTowerGimmicks(battle,{p1:own,p2:Showdown.Teams.unpack(raid.opponentTeam)!},undefined,'basic','basic',undefined,[],true,true);
 installGolisopodMega(battle);installRaid(battle,raid);
 const damage=battle.actions.getDamage.bind(battle.actions);
 battle.actions.getDamage=(source,...args)=>source.side.id==='p1'?1000000:damage(source,...args);
 battle.setPlayer('p1',{name:'Player',team:Showdown.Teams.pack(own)});battle.setPlayer('p2',{name:'Tower AI',team:raid.opponentTeam});
 battle.makeChoices('team 123','team '+raid.phases.map((_,i)=>i+1).join(''));
 const player=battle.p1.active[0];player.hp=player.maxhp=1000000;player.storedStats.spe=100000;
 return battle;
}

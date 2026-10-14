import {writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {defaultProfile,validateProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import {statKeys,type TrainingProfile} from '../src/data/training';
type Case={id:string;team:string[];moves:Record<string,string[]>;profiles:Record<string,TrainingProfile>;items:Record<string,string>};
const definitions=[
 {id:'espeon-screen',team:['Espeon','Gyarados','Scizor'],moves:{Espeon:['Psychic','Reflect','Light Screen','Baton Pass'],Gyarados:['Waterfall','Ice Fang','Earthquake','Dragon Dance'],Scizor:['Bullet Punch','U-turn','Roost','Swords Dance']}},
 {id:'grimmsnarl-screen',team:['Grimmsnarl','Garchomp','Volcarona'],moves:{Grimmsnarl:['Spirit Break','Reflect','Light Screen','Parting Shot'],Garchomp:['Earthquake','Dragon Claw','Rock Slide','Swords Dance'],Volcarona:['Fiery Dance','Bug Buzz','Giga Drain','Quiver Dance']}},
 {id:'klefki-screen',team:['Klefki','Dragonite','Azumarill'],moves:{Klefki:['Foul Play','Reflect','Light Screen','Thunder Wave'],Dragonite:['Dragon Claw','Earthquake','Roost','Dragon Dance'],Azumarill:['Waterfall','Play Rough','Aqua Jet','Ice Punch']}},
 {id:'snow-veil',team:['Abomasnow','Gyarados','Garchomp'],moves:{'Abomasnow':['Blizzard','Giga Drain','Ice Shard','Aurora Veil'],Gyarados:['Waterfall','Ice Fang','Earthquake','Dragon Dance'],Garchomp:['Earthquake','Dragon Claw','Rock Slide','Swords Dance']}},
 {id:'attack-control',team:['Garchomp','Gyarados','Gengar'],moves:{Garchomp:['Earthquake','Dragon Claw','Rock Slide','Swords Dance'],Gyarados:['Waterfall','Ice Fang','Earthquake','Dragon Dance'],Gengar:['Shadow Ball','Sludge Bomb','Thunderbolt','Dazzling Gleam']}},
 {id:'room-control',team:['Slowbro','Snorlax','Torkoal'],moves:{Slowbro:['Scald','Psychic','Slack Off','Trick Room'],Snorlax:['Body Slam','Crunch','Curse','Rest'],Torkoal:['Flamethrower','Earth Power','Solar Beam','Protect']}},
];
const cases:Case[]=definitions.map(c=>{
 const profiles=Object.fromEntries(c.team.map(name=>{
  const p=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats,attack=base.atk>=base.spa?'atk':'spa';
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as TrainingProfile['ivs'];
  p.evs={hp:13,atk:0,def:0,spa:0,spd:0,spe:21,[attack]:32};p.nature=attack==='atk'?'Adamant':'Modest';p.moves=c.moves[name as keyof typeof c.moves]!;
  if(c.id==='room-control'){p.ivs.spe=0;p.evs={hp:32,atk:0,def:2,spa:0,spd:0,spe:0,[attack]:32};p.nature=attack==='atk'?'Brave':'Quiet';}
  return [name,p];
 }));
 if(c.id==='grimmsnarl-screen'||c.id==='klefki-screen'){const p=profiles[c.team[0]];p.ability='Prankster';p.evs={hp:32,atk:0,def:16,spa:0,spd:18,spe:0};p.nature='Careful';}
 if(c.id==='snow-veil'){const p=profiles['Abomasnow'];p.ability='Snow Warning';p.evs={hp:32,atk:0,def:0,spa:2,spd:0,spe:32};p.nature='Timid';}
 if(profiles.Dragonite)profiles.Dragonite.ability='Multiscale';if(profiles.Azumarill)profiles.Azumarill.ability='Huge Power';
 const items=c.id.endsWith('-screen')||c.id==='snow-veil'?{[c.team[0]]:'Light Clay'}:{};
 for(const name of c.team)validateProfile(name,profiles[name]);
 const team=packTeam(c.team,profiles,items),errors=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50').validateTeam(Showdown.Teams.unpack(team)!.map(s=>({...s,pokeball:'',evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}})));
 if(errors?.length)throw Error(errors.join('\n'));console.log('Validated '+c.id);
 return {...c,profiles,items};
});
writeFileSync('artifacts/experiments/ai/support-player-cases.json',JSON.stringify(cases,null,2));

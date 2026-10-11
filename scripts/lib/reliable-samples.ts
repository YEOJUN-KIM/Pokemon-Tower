import Showdown from 'pokemon-showdown';
import {trainedStat,type TrainingProfile} from '../../src/data/training';
import {pokemonSets} from '../../src/data/teams';
import {moveLearnsets} from '../../src/server/move-learnsets';

// Conservative static sample preparation; no enemy sets or future battle input.
export function moveBurdenMultiplier(text:string,profile:TrainingProfile){
 const m=Showdown.Dex.moves.get(text),ids=profile.moves.map(m=>Showdown.toID(m));
 let value=1;
 if(m.flags.recharge)value*=.45;
 if(m.flags.charge)value*=.4;
 if(m.selfdestruct)value*=.2;
 if(m.recoil)value*=.85;
 if(m.id==='dreameater'&&!ids.some(id=>['spore','sleeppowder','hypnosis','lovelykiss','sing','grasswhistle','darkvoid','yawn'].includes(id)))return 0;
 if(['belch','fling','naturalgift'].includes(m.id))return 0; // No supporting item in initial samples.
 if(m.id==='shelltrap')value*=.2;
 if(m.id==='focuspunch')value*=ids.includes('substitute')?.65:.3;
 if(['lastresort','synchronoise'].includes(m.id))value*=.2;
 if(['counter','mirrorcoat','metalburst'].includes(m.id))value*=.4;
 if(m.id==='fakeout')value*=.5;
 if(m.id==='suckerpunch')value*=.65;
 if(['waterspout','eruption','dragonenergy'].includes(m.id))value*=.8;
 return value;
}
export function reliableSampleMoves(name:string,p:TrainingProfile){
 const species=Showdown.Dex.species.get(name),validator=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50');
 const score=(text:string)=>{
  const m=Showdown.Dex.moves.get(text),stat=m.category==='Physical'?'atk':'spa';
  const attack=trainedStat(species.baseStats[stat],p.ivs[stat],p.evs[stat],stat,p.nature);
  return (m.basePower||30)*(species.types.includes(m.type)?1.5:1)*attack/100*(m.accuracy===true?1:m.accuracy/100)*moveBurdenMultiplier(text,p);
 };
 const attacks=moveLearnsets[name].legalMoves.filter(m=>Showdown.Dex.moves.get(m).category!=='Status'&&score(m)>0&&!validator.validateSet({...structuredClone(pokemonSets[name]),moves:[m]},{})).sort((a,b)=>score(b)-score(a)||a.localeCompare(b));
 const chosen=p.moves.filter(m=>Showdown.Dex.moves.get(m).category==='Status');
 const keep=(m:string)=>{if(m&&!chosen.includes(m)&&chosen.length<4)chosen.push(m);};
 keep(attacks[0]);
 for(const m of attacks)if(!chosen.some(n=>Showdown.Dex.moves.get(n).category!=='Status'&&Showdown.Dex.moves.get(n).type===Showdown.Dex.moves.get(m).type))keep(m);
 for(const m of attacks)keep(m);
 if(chosen.length!==4||!chosen.some(m=>Showdown.Dex.moves.get(m).category!=='Status'))throw Error('Sample needs dedicated role: '+name);
 return chosen;
}

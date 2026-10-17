import {namedTrainerSamples,type TrainerSample} from './trainer-catalog';
import {towerThemes,type TowerTheme} from './tower-themes';

// Organization rosters are independent of the tower's regional chapters.
export const villainOrganizations=[
  {id:'rocket',name:'로켓단',portrait:'rocketgrunt',entries:['Raticate','Golbat','Arbok','Weezing','Persian','Muk']},
  {id:'magma',name:'마그마단',portrait:'magmagrunt',entries:['Mightyena','Golbat','Camerupt','Weezing','Magcargo','Sandslash']},
  {id:'galactic',name:'갤럭시단',portrait:'galacticgrunt',entries:['Golbat','Purugly','Skuntank','Dustox','Bronzong','Toxicroak']},
  {id:'plasma',name:'플라스마단',portrait:'plasmagrunt',entries:['Watchog','Liepard','Garbodor','Scrafty','Krookodile','Bisharp']},
  {id:'flare',name:'플레어단',portrait:'flaregrunt',entries:['Mightyena','Golbat','Houndoom','Scrafty','Manectric','Swalot']},
  {id:'skull',name:'스컬단',portrait:'skullgrunt',entries:['Raticate','Golbat','Gengar','Salazzle','Hypno','Scrafty']},
  {id:'aqua',name:'아쿠아단',portrait:'aquagrunt',entries:['Mightyena','Golbat','Sharpedo','Tentacruel','Muk','Wailord']},
  {id:'aether',name:'에테르재단',portrait:'aetherfoundation',entries:['Hypno','Slowbro','Golbat','Ledian','Mudsdale','Gumshoos']},
  {id:'macrocosmos',name:'매크로코스모스',portrait:'officeworker',entries:['Copperajah','Durant','Bronzong','Mawile','Ferroseed','Perrserker']},
  {id:'star',name:'스타단',portrait:'teamstargrunt',entries:['Murkrow','Houndoom','Torkoal','Skuntank','Revavroom','Primeape']},
] as const;
export const VILLAIN_CHANCE=.08;
export const VILLAIN_BOSS_MIN_FLOOR=75;
// Shared sample source for scripted campaigns; no encounter roll or floor gate.
export function organizationGrunt(organization:string):TrainerSample {
 const group=villainOrganizations.find(group=>group.id===organization);
 if(!group)throw Error('Unknown villain organization');
 return {id:`${group.id}-grunt`,name:'조직원',title:group.name,kind:'normal',role:'villain',generation:null,specialty:null,tactic:'status',portrait:group.portrait,minFloor:1,entries:group.entries,concept:`${group.name}의 조직원`};
}
function ticket(key:string){let hash=2166136261;for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619);hash=Math.imul(hash^(hash>>>16),0x85ebca6b);hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);return ((hash^(hash>>>16))>>>0)/4294967296;}
export function runOrganization(runId:string,theme?:TowerTheme|null) {
 const candidates=theme?towerThemes[theme].organizations:villainOrganizations.map(group=>group.id);
 return candidates[Math.floor(ticket(`organization:${runId}`)*candidates.length)];
}
export function villainGrunt(runId:string,floor:number,organization:string,previousVillain=false):TrainerSample|null {
  if(floor%5===0 || previousVillain || ticket(`villain:${runId}:${floor}`)>=VILLAIN_CHANCE)return null;
  const group=villainOrganizations.find(group=>group.id===organization);if(!group)return null;
  return organizationGrunt(organization);
}

export type VillainRank='grunt'|'executive'|'boss';
export type VillainEvent={organization:string;name:string;rank:VillainRank;bonus:number};
export const villainRankNames:Record<VillainRank,string>={grunt:'조직원',executive:'간부',boss:'보스'};
export const villainBonuses:Record<VillainRank,number>={grunt:0,executive:250,boss:1000};
const leader=(id:string)=>namedTrainerSamples.find(s=>s.id===`named-${id}`)!;
const executive=(id:string,name:string,portrait:string,entries:string[],ace=entries[0]):TrainerSample=>({id,name,portrait,entries,ace,title:'',role:'villain',kind:'named',generation:null,specialty:null,tactic:'status',minFloor:16,concept:'조직 간부의 테마 파티'});
export const villainLeaders:Record<string,{executive:TrainerSample;boss:TrainerSample}>={
 rocket:{executive:leader('archer'),boss:leader('giovanni')},
 magma:{executive:executive('tabitha','호걸','tabitha',['Camerupt','Mightyena','Golbat','Weezing','Magcargo']),boss:leader('maxie')},
 galactic:{executive:executive('mars','마스','mars',['Purugly','Golbat','Bronzong','Skuntank','Toxicroak']),boss:leader('cyrus')},
 plasma:{executive:executive('zinzolin','칠현인 비오','zinzolin',['Cryogonal','Weavile','Garbodor','Scrafty','Bisharp']),boss:leader('ghetsis')},
 flare:{executive:executive('xerosic','크세로시키','xerosic',['Malamar','Crobat','Houndoom','Scrafty','Swalot']),boss:leader('lysandre')},
 skull:{executive:executive('plumeria','플루메리','plumeria',['Salazzle','Golbat','Gengar','Muk','Crobat']),boss:{...executive('guzma','구즈마','guzma',['Golisopod','Scizor','Pinsir','Masquerain','Ariados']),tactic:'physical',minFloor:31}},
 aqua:{executive:executive('matt','해조','matt',['Sharpedo','Mightyena','Crobat','Walrein','Muk']),boss:leader('archie')},
 aether:{executive:executive('faba','자우보','faba',['Hypno','Slowbro','Bruxish','Alakazam','Espeon']),boss:leader('lusamine')},
 macrocosmos:{executive:leader('oleana'),boss:leader('rose')},
 star:{executive:leader('giacomo'),boss:leader('penny')},
};
export type VillainProgress={gruntWins:number;executiveWins:number};
// Victories shift the next draw upwards; a small chance for lower ranks remains.
export function villainRankWeights(floor:number,progress:VillainProgress={gruntWins:0,executiveWins:0}):Record<VillainRank,number>{
 if(floor<16)return {grunt:1,executive:0,boss:0};
 if(floor<VILLAIN_BOSS_MIN_FLOOR){const grunt=Math.max(5,65-10*progress.gruntWins);return {grunt:grunt/100,executive:(100-grunt)/100,boss:0};}
 const grunt=Math.max(5,35-8*progress.gruntWins);
 const executive=Math.max(5,40+Math.floor((35-grunt)/2)-12*progress.executiveWins);
 return {grunt:grunt/100,executive:executive/100,boss:(100-grunt-executive)/100};
}
export function villainEncounter(runId:string,floor:number,organization:string,previousVillain=false,ended=false,progress:VillainProgress={gruntWins:0,executiveWins:0},eligible:(sample:TrainerSample)=>boolean=()=>true):{sample:TrainerSample;event:VillainEvent}|null {
 if(ended)return null;
 const grunt=villainGrunt(runId,floor,organization,previousVillain);if(!grunt)return null;
 const weights=villainRankWeights(floor,progress);
 const candidates=(['grunt','executive','boss'] as const).filter(rank=>weights[rank]>0 && eligible(rank==='grunt'?grunt:villainLeaders[organization][rank]));
 if(!candidates.length)return null;
 let roll=ticket(`villain-rank:${runId}:${floor}`)*candidates.reduce((sum,rank)=>sum+weights[rank],0);
 const rank=candidates.find(rank=>(roll-=weights[rank])<0) ?? candidates.at(-1)!;
 const group=villainOrganizations.find(g=>g.id===organization)!,base=rank==='grunt'?grunt:villainLeaders[organization][rank];
 return {sample:{...base,id:rank==='grunt'?grunt.id:`${organization}-${rank}-${base.portrait}`,title:`${group.name} ${rank==='grunt'?'':villainRankNames[rank]}`.trim(),role:'villain',minFloor:rank==='boss'?VILLAIN_BOSS_MIN_FLOOR:rank==='executive'?16:1},event:{organization,name:group.name,rank,bonus:villainBonuses[rank]}};
}

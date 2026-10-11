import Showdown from 'pokemon-showdown';
import type {Observation} from './policy';

// Parses only this player's public stream. Private opponent requests never enter here.
export class PublicSwitchInformation {
 private hazards={spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false};
 private boosts:Record<string,number>={};
 private dynamax=false;
 private species='';
 private tera:string|null=null;
 private changedTypes:string[]|null=null;
 private addedType:string|null=null;
 constructor(private side:'p1'|'p2'){}
 consume(line:string){
  const [,event,actor,value,extra]=line.split('|'),own=actor?.startsWith(`${this.side}a:`),enemy=actor?.startsWith(`${this.side==='p1'?'p2':'p1'}a:`);
  if(actor?.startsWith(`${this.side}:`) && (event==='-sidestart' || event==='-sideend')){
   const on=event==='-sidestart';
   const hazard=value.replace(/^move: /,'');
   if(hazard==='Spikes')this.hazards.spikes=on?Math.min(3,this.hazards.spikes+1):0;
   if(hazard==='Toxic Spikes')this.hazards.toxicSpikes=on?Math.min(2,this.hazards.toxicSpikes+1):0;
   if(hazard==='Stealth Rock')this.hazards.stealthRock=on;
   if(hazard==='Sticky Web')this.hazards.stickyWeb=on;
  }
  if(own){
   if(['switch','drag','replace'].includes(event)){this.boosts={};this.dynamax=false;}
   if(event==='-start' && value==='Dynamax')this.dynamax=true;
   if(event==='-end' && value==='Dynamax')this.dynamax=false;
   if(event==='-boost' || event==='-unboost')this.boosts[value]=Math.max(-6,Math.min(6,(this.boosts[value]??0)+(event==='-boost'?1:-1)*Number(extra)));
   if(event==='-setboost')this.boosts[value]=Number(extra);
   if(event==='-clearboost')this.boosts={};
   if(event==='-clearpositiveboost')for(const stat of Object.keys(this.boosts))this.boosts[stat]=Math.min(0,this.boosts[stat]);
   if(event==='-clearnegativeboost')for(const stat of Object.keys(this.boosts))this.boosts[stat]=Math.max(0,this.boosts[stat]);
  }
  if(event==='-clearallboost')this.boosts={};
  if(enemy){
   if(['switch','drag','replace'].includes(event)){this.species=value.split(',')[0];this.tera=value.match(/tera:([A-Za-z]+)/)?.[1]??null;this.changedTypes=null;this.addedType=null;}
   if(['-formechange','detailschange'].includes(event))this.species=value.split(',')[0];
   if(event==='-terastallize')this.tera=value;
   if(event==='-start' && value==='typechange')this.changedTypes=extra.split('/');
   if(event==='-start' && value==='typeadd')this.addedType=extra;
   if(event==='-end' && value==='typechange')this.changedTypes=null;
   if(event==='-end' && value==='typeadd')this.addedType=null;
  }
 }
 view():NonNullable<Observation['switching']>{
  const base=this.changedTypes??Showdown.Dex.species.get(this.species).types;
  const types=this.tera && this.tera!=='Stellar'?[this.tera]:[...base,...(this.addedType?[this.addedType]:[])];
  return {hazards:{...this.hazards},boosts:{...this.boosts},dynamax:this.dynamax,opponentTypes:[...new Set(types)]};
 }
}

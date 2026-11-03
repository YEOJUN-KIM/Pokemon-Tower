import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {rollScoutDraws} from '../data/scout';
import {rollShiny} from '../data/shiny-odds';
import type {ScoutGroup} from '../data/run-economy';

export type ScoutOffer={species:string;group:ScoutGroup;price:number;shiny:boolean;purchased:boolean};
export type ScoutState={revision:number;offers:ScoutOffer[]};
// Pokemon Scout candidates for one checkpoint. Saved once per (run, floor, revision) so rendering never re-rolls.
export class ScoutShop {
  constructor(private db:DatabaseSync){}
  private random(runId:string,floor:number,revision:number){let counter=0;return ()=>createHash('sha256').update(`${runId}:scout:${floor}:${revision}:${counter++}`).digest().readUInt32LE(0)/4294967296;}
  saved(runId:string,floor:number):ScoutState|undefined{
    const row=this.db.prepare('SELECT revision,offers FROM scout_shops WHERE run_id=? AND floor=?').get(runId,floor) as {revision:number;offers:string}|undefined;
    return row?{revision:row.revision,offers:JSON.parse(row.offers)}:undefined;
  }
  // Candidates that belong to the current roster are never offered.
  private roll(runId:string,floor:number,revision:number,roster:readonly string[],charmLevel:number):ScoutOffer[]{
    const random=this.random(runId,floor,revision);
    return rollScoutDraws(floor-1,random,new Set(roster)).map(draw=>({...draw,shiny:rollShiny('scout',charmLevel,max=>Math.floor(random()*max)),purchased:false}));
  }
  state(runId:string,floor:number,roster:readonly string[],charmLevel:number):ScoutState{
    const existing=this.saved(runId,floor);if(existing)return existing;
    const state={revision:0,offers:this.roll(runId,floor,0,roster,charmLevel)};
    this.db.prepare('INSERT INTO scout_shops VALUES (?,?,?,?)').run(runId,floor,state.revision,JSON.stringify(state.offers));
    return state;
  }
  // Replaces all candidates. The caller has already charged the reroll price.
  reroll(runId:string,floor:number,roster:readonly string[],charmLevel:number):ScoutState{
    const revision=(this.saved(runId,floor)?.revision??-1)+1,state={revision,offers:this.roll(runId,floor,revision,roster,charmLevel)};
    this.db.prepare('INSERT INTO scout_shops VALUES (?,?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET revision=excluded.revision,offers=excluded.offers').run(runId,floor,revision,JSON.stringify(state.offers));
    return state;
  }
  markPurchased(runId:string,floor:number,species:string){
    const state=this.saved(runId,floor)!;
    this.db.prepare('UPDATE scout_shops SET offers=? WHERE run_id=? AND floor=?').run(JSON.stringify(state.offers.map(o=>o.species===species?{...o,purchased:true}:o)),runId,floor);
  }
}

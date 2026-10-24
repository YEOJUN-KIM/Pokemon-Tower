import type {DatabaseSync} from 'node:sqlite';
import {TutorialStep,type TutorialState} from '../data/tutorial';
import {initializeStartingGrowth} from './initial-growth';
import {statKeys,type TrainingProfile} from '../data/training';
import {BattleRequestError} from './request-error';
import {initialPartners} from '../data/teams';

type TutorialRow={step:TutorialStep;reward_granted:number;party:string;selected_species:string|null};
export class TutorialService {
  constructor(private db:DatabaseSync){}
  ensure(owner:string) {
    // Legacy players with actual progress should never be interrupted by onboarding.
    const progressed=this.db.prepare(`SELECT 1 FROM players WHERE id=? AND (coins>0 OR growth_points>0
      OR EXISTS(SELECT 1 FROM runs WHERE player_id=players.id)
      OR EXISTS(SELECT 1 FROM pokemon_training WHERE player_id=players.id)
      OR EXISTS(SELECT 1 FROM permanent_receipts WHERE player_id=players.id)
      OR EXISTS(SELECT 1 FROM unlocks WHERE player_id=players.id AND species NOT IN (SELECT value FROM json_each(?))))`).get(owner,JSON.stringify(initialPartners));
    this.db.prepare('INSERT OR IGNORE INTO player_tutorial(player_id,step) VALUES (?,?)').run(owner,progressed?TutorialStep.Completed:TutorialStep.NotStarted);
    initializeStartingGrowth(this.db,owner);
  }
  view(owner:string):TutorialState {
    this.ensure(owner);
    this.advance(owner,TutorialStep.AwaitVictory,TutorialStep.RecruitmentGuide,!!this.db.prepare("SELECT 1 FROM runs WHERE player_id=? AND state='recruit'").get(owner));
    const row=this.db.prepare('SELECT step,reward_granted,party,selected_species FROM player_tutorial WHERE player_id=?').get(owner) as TutorialRow;
    return {step:row.step,rewardGranted:!!row.reward_granted,party:JSON.parse(row.party),selectedSpecies:row.selected_species};
  }
  private advance(owner:string,from:TutorialStep,to:TutorialStep,condition=true) {
    if(condition)this.db.prepare('UPDATE player_tutorial SET step=? WHERE player_id=? AND step=?').run(to,owner,from);
  }
  action(owner:string,event:unknown,expected:unknown,party?:unknown,species?:unknown) {
    const state=this.view(owner);
    if(event==='skip') {this.db.prepare('UPDATE player_tutorial SET step=? WHERE player_id=?').run(TutorialStep.Completed,owner);return;}
    if(expected!==state.step)return; // Idempotent retries and stale browser tabs cannot rewind progress.
    if(event==='begin' && state.step===TutorialStep.NotStarted) {
      this.advance(owner,TutorialStep.NotStarted,TutorialStep.Introduction);return;
    }
    if(event==='next') {
      const next:Partial<Record<TutorialStep,TutorialStep>>={Introduction:TutorialStep.StartGame,PokemonInfoViewed:TutorialStep.StatUpgrade,RecruitmentGuide:TutorialStep.RecruitmentChoice,Completion:TutorialStep.Completed};
      if(next[state.step])this.advance(owner,state.step,next[state.step]!);return;
    }
    if(event==='enter-selection'){this.advance(owner,TutorialStep.StartGame,TutorialStep.SelectPokemon);return;}
    // Old tutorials that already removed their party have no recoverable target.
    // Bind their next explicit owned-card choice, never an arbitrary starter.
    if(event==='select-target'&&!state.selectedSpecies&&[TutorialStep.PokemonInfo,TutorialStep.StatUpgrade].includes(state.step as never)){
      if(typeof species!=='string'||!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,species))throw new BattleRequestError('해금한 튜토리얼 포켓몬을 선택해 주세요.',400);
      this.db.prepare('UPDATE player_tutorial SET selected_species=? WHERE player_id=? AND selected_species IS NULL').run(species,owner);return;
    }
    if(event==='info-open'){this.advance(owner,TutorialStep.PokemonInfo,TutorialStep.PokemonInfoViewed,!!state.selectedSpecies&&species===state.selectedSpecies);return;}
    const partySteps:readonly TutorialStep[]=[TutorialStep.SelectPokemon,TutorialStep.RemovePokemon,TutorialStep.PokemonInfo,TutorialStep.StatUpgrade,TutorialStep.CompleteTeam,TutorialStep.StartBattle];
    if(event==='party' && partySteps.includes(state.step)) {
      if(!Array.isArray(party)||party.length>3||new Set(party).size!==party.length||party.some(name=>typeof name!=='string'||!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,name)))throw new BattleRequestError('튜토리얼 파티가 올바르지 않습니다.',400);
      this.db.prepare('UPDATE player_tutorial SET party=? WHERE player_id=?').run(JSON.stringify(party),owner);
      if(state.step===TutorialStep.SelectPokemon&&!state.selectedSpecies){
        const selected=party.find(name=>!state.party.includes(name));
        if(selected)this.db.prepare('UPDATE player_tutorial SET selected_species=? WHERE player_id=? AND selected_species IS NULL').run(selected,owner);
      }
      this.advance(owner,TutorialStep.SelectPokemon,TutorialStep.RemovePokemon,party.length>state.party.length);
      this.advance(owner,TutorialStep.RemovePokemon,TutorialStep.PokemonInfo,party.length<state.party.length);
      this.advance(owner,TutorialStep.CompleteTeam,TutorialStep.StartBattle,party.length===3);
    }
  }
  upgraded(owner:string,species:string,before:TrainingProfile,after:TrainingProfile) {
    const state=this.view(owner);
    this.advance(owner,TutorialStep.StatUpgrade,TutorialStep.CompleteTeam,species===state.selectedSpecies&&statKeys.some(key=>after.evs[key]>before.evs[key]));
  }
  battleStarted(owner:string){this.advance(owner,TutorialStep.StartBattle,TutorialStep.TypeGuide);}
  moveUsed(owner:string){this.advance(owner,TutorialStep.TypeGuide,TutorialStep.AwaitVictory);}
  recruited(owner:string){this.advance(owner,TutorialStep.RecruitmentChoice,TutorialStep.Completion);}
}

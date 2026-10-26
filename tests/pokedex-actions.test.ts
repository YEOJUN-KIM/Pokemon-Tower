import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {pokedexEntries} from '../src/server/pokedex-entries';

test('shared dex actions follow mode and selection, preserving limits and handlers',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 try{
  const {PokemonActions}=await import('../src/web/pokedex-dialog');
  const entry=pokedexEntries().find(p=>p.species==='Charizard')!;
  for(const mode of ['selection','collection'] as const)for(const chosen of [false,true]){
   const calls:string[]=[];
   const props={mode,entry,chosen,canChoose:!chosen,canAdjust:true,full:false,onChoose:()=>calls.push('party'),onAdjust:()=>calls.push('settings'),onInfo:()=>calls.push('info'),onClose:()=>calls.push('cancel')};
   const html=renderToStaticMarkup(createElement(PokemonActions,props));
   const labels=[...html.matchAll(/aria-keyshortcuts="\d" aria-label="([^"]+)"/g)].map(m=>m[1]);
   assert.deepEqual(labels,mode==='selection'?[chosen?'포켓몬 제외':'포켓몬 넣기','포켓몬 설정','포켓몬 정보','취소']:['포켓몬 설정','포켓몬 정보','취소']);
   const choices=PokemonActions(props).props.children[1].props.children;
   for(const choice of choices)choice.props.onClick();
   assert.deepEqual(calls,mode==='selection'?['party','settings','info','cancel']:['settings','info','cancel']);
   const fullChoices=PokemonActions({...props,canChoose:false,full:true}).props.children[1].props.children;
   if(mode==='selection')assert.equal(fullChoices[0].props.disabled,!chosen);
   const lockedChoices=PokemonActions({...props,canAdjust:false}).props.children[1].props.children;
   assert.equal(lockedChoices[mode==='selection'?1:0].props.disabled,true);
   assert.equal(lockedChoices[mode==='selection'?2:1].props.disabled,false);
  }
 }finally{hooks.deregister();}
});

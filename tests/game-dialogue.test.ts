import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {battleMessageEntries} from '../src/web/battle-message-data';

test('animated SSR contains only the empty displayed text, with no full-text attributes or hidden copies',async()=>{
 const hooks=registerHooks({load(url,ctx,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,ctx);}});
 try{
  const {GameDialogue}=await import('../src/web/game-dialogue');
  const text='같은 문장이라도 다른 이벤트에서는 빈 상태에서 시작한다.';
  for(const messageKey of ['event-1:choice','event-1:reward','event-2:choice']){
   const html=renderToStaticMarkup(createElement(GameDialogue,{text,messageKey}));assert.ok(!html.includes(text));assert.ok(!html.includes('data-full-text'));assert.ok(html.includes('data-typing="true"'));assert.ok(html.includes(`data-message-key="${messageKey}"`));
  }
  assert.ok(renderToStaticMarkup(createElement(GameDialogue,{text,animated:false})).includes(text));
  const {BattleMessages}=await import('../src/web/battle-messages');
  const messages=['|move|p1a: Charizard|Flamethrower|p2a: Mew'];
  const entry=battleMessageEntries(messages)[0];assert.ok(entry.text.length>0);
  const html=renderToStaticMarkup(createElement(BattleMessages,{messages,playing:false,turn:1,messageKey:'run-1:battle-1'}));assert.ok(!html.includes(entry.text));assert.ok(!html.includes('data-full-text'));
  const history=renderToStaticMarkup(createElement(BattleMessages,{messages,playing:false,turn:1,historyOnly:true}));assert.ok(history.includes(entry.text));
 }finally{hooks.deregister();}
});

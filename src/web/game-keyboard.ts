
'use client';
import {useEffect,useRef} from 'react';
import {effect} from './game-audio';

type Select=(element:HTMLElement|null|undefined)=>void;
export function selectGameCursor(element:HTMLElement|null|undefined) {
  if(element instanceof HTMLButtonElement && document.activeElement instanceof HTMLElement && document.activeElement.matches('input,select,textarea'))document.activeElement.blur();
  if(element)document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:element}));
}

/** Cursor state belongs to each screen/dialog, never to document.activeElement. */
export function useGameKeyboard(selector:string,columns:number,enabled:boolean,shortcut?:(event:KeyboardEvent,cursor:HTMLButtonElement|null,select:Select)=>boolean,onSelect?:(cursor:HTMLButtonElement)=>void) {
  const memory=useRef(new Map<Element|string,{element:HTMLButtonElement;key:string}>()),marked=useRef<HTMLElement|null>(null);
  const callbacks=useRef({shortcut,onSelect});callbacks.current={shortcut,onSelect};
  useEffect(()=>{
    if(!enabled)return;
    const keyOf=(button:HTMLButtonElement)=>button.dataset.command ?? button.dataset.species ?? button.dataset.machine ?? button.dataset.target ?? button.dataset.learningSlot ?? button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '';
    const context=()=>Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? 'screen';
    const buttons=(scope:Element|string)=>Array.from((typeof scope==='string' ? document : scope).querySelectorAll<HTMLButtonElement>(typeof scope==='string' ? selector : 'button')).filter(button=>(!button.disabled || button.hasAttribute('data-game-focusable')) && button.getAttribute('aria-disabled')!=='true' && button.getClientRects().length>0);
    function draw(target?:HTMLElement|null) {
      const scope=context(),items=buttons(scope);
      const saved=memory.current.get(scope);
      // A request briefly disables controls; keep its cursor until they return.
      if(saved?.element.isConnected && saved.element.disabled && saved.element.closest('[aria-busy=true]'))return saved.element;
      let current=target && items.includes(target as HTMLButtonElement) ? target as HTMLButtonElement : saved && items.includes(saved.element) ? saved.element : items.find(item=>keyOf(item)===saved?.key);
      if(!current && saved?.element.isConnected){const tabScope=saved.element.closest('[data-tab-scope]');if(tabScope)current=items.find(item=>item.closest('[data-tab-scope]')===tabScope);}
      current ??= typeof scope==='string' ? items.find(item=>item.matches('.dex-card.selected')) ?? items[0] : items.find(item=>item.matches('[data-initial-focus],[autofocus],.recruit-dialog-actions .primary-button')) ?? items.find(item=>!item.closest('.dex-dialog-heading')) ?? items[0];
      if(marked.current!==current){marked.current?.removeAttribute('data-game-cursor');marked.current=current ?? null;}
      if(current){memory.current.set(scope,{element:current,key:keyOf(current)});if(window.matchMedia('(max-width:760px)').matches)current.removeAttribute('data-game-cursor');else current.setAttribute('data-game-cursor','true');if(typeof scope==='string')callbacks.current.onSelect?.(current);if(current.matches('[data-game-text-input]') && document.activeElement!==current)current.focus({preventScroll:true});else if(document.activeElement instanceof HTMLElement && document.activeElement.matches('[data-game-text-input]') && document.activeElement!==current)document.activeElement.blur();}
      return current ?? null;
    }
    const select:Select=element=>{const previous=marked.current;draw(element);if(element && marked.current!==previous)effect('cursor');};
    function handle(event:KeyboardEvent) {
      const target=event.target as HTMLElement|null;
      if(event.altKey || event.ctrlKey || event.metaKey)return;
      if(target?.closest('input,select,textarea,[contenteditable="true"]') && !( ['q','e'].includes(event.key.toLowerCase()) && target.matches('select,input[type=number],input[type=range]') && (typeof context()==='string'?document:(context() as Element)).querySelector('[data-game-tabs]')))return;
      if(event.key==='Tab'){document.body.dataset.gameInput='native';return;}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Enter'].includes(event.key) || ['z','x','c','a','s','q','e','v','f','r'].includes(event.key.toLowerCase()))document.body.dataset.gameInput='cursor';
      const key=event.key.toLowerCase(),scope=context(),cursor=draw();
      if(event.repeat && (['enter','z','x','c','q','e'].includes(key)||/^[1-5]$/.test(key))){event.preventDefault();return;}
      if(/^[1-5]$/.test(key)&&scope instanceof HTMLDialogElement){const button=scope.querySelector<HTMLButtonElement>(`button[data-number-shortcut="${key}"]`);if(button){event.preventDefault();if(!button.disabled&&button.getClientRects().length){document.body.dataset.gameInput='cursor';select(button);button.click();}return;}}
      if(key==='x' && cursor?.closest('[data-keyboard-zone=library]')){
        event.preventDefault();effect('cancel');
        const slot=cursor.closest('[data-keyboard-zones]')?.querySelector<HTMLButtonElement>('[data-keyboard-zone=slots] button.selected:not(:disabled)');
        select(slot);slot?.scrollIntoView({block:'nearest',inline:'nearest'});return;
      }
      const training=scope instanceof HTMLDialogElement && scope.matches('.training-picker') ? null : cursor?.closest('.training-editor');
      const trainingRow=cursor?.closest('[data-training-stat]');
      if(training && key==='x' && !cursor?.closest('.training-tabs')){event.preventDefault();effect('cancel');select(training.querySelector<HTMLButtonElement>('.training-tabs [aria-selected=true]'));return;}
      if(training && cursor?.closest('.training-tabs') && event.key.startsWith('Arrow')){
        event.preventDefault();
        if(['arrowleft','arrowright'].includes(key)){
          const tabs=Array.from(training.querySelectorAll<HTMLButtonElement>('.training-tabs button:not(:disabled)'));
          const next=tabs[Math.max(0,Math.min(tabs.length-1,tabs.indexOf(cursor)+(key==='arrowright'?1:-1)))];
          next.click();select(next);
        }
        return;
      }
      if(training && cursor?.closest('.training-tabs') && ['enter','z'].includes(key)){
        event.preventDefault();cursor.click();requestAnimationFrame(()=>{const panel=training.querySelector('[role=tabpanel]:not([hidden])');const first=panel?.querySelector<HTMLButtonElement>('.training-stat-select,.training-trait-button,.nature-matrix button[aria-pressed=true]') ?? panel?.querySelector<HTMLButtonElement>('button:not(:disabled)');select(first);first?.scrollIntoView({block:'nearest'});});return;
      }
      if(training && event.key.startsWith('Arrow') && (trainingRow || (cursor?.matches('.training-save-bar button') && training.querySelector('#training-panel-stats:not([hidden])')))){
        event.preventDefault();const rows=Array.from(training.querySelectorAll<HTMLButtonElement>('.training-stat-select'));
        if(trainingRow && ['arrowleft','arrowright'].includes(key)){select(trainingRow.querySelector<HTMLButtonElement>('.training-stat-select'));const button=trainingRow.querySelector<HTMLButtonElement>(`button[data-point-delta="${key==='arrowright'?1:-1}"]`);if(button && !button.disabled)button.click();return;}
        const current=trainingRow?.querySelector<HTMLButtonElement>('.training-stat-select'),index=current?rows.indexOf(current):rows.length;
        const next=key==='arrowup'?rows[index-1] ?? training.querySelector<HTMLButtonElement>('.training-tabs [aria-selected=true]'):key==='arrowdown'?rows[index+1] ?? training.querySelector<HTMLButtonElement>('.training-save-bar button:not(:disabled)'):null;
        if(next){select(next);next.scrollIntoView({block:'nearest'});}return;
      }
      if(training && training.querySelector('#training-panel-traits:not([hidden])') && event.key.startsWith('Arrow') && cursor?.matches('.training-trait-button,.training-save-bar button')){
        event.preventDefault();const entries=Array.from(training.querySelectorAll<HTMLButtonElement>('.training-trait-button:not(:disabled),.training-save-bar button:not(:disabled)'));
        const index=entries.indexOf(cursor),next=key==='arrowup'?entries[index-1] ?? training.querySelector<HTMLButtonElement>('.training-tabs [aria-selected=true]'):key==='arrowdown'?entries[index+1]:null;
        if(next){select(next);next.scrollIntoView({block:'nearest'});}return;
      }
      const candidateTabScope=cursor?.closest('[data-keyboard-tab-scope]');
      const tabScope=candidateTabScope && (typeof scope==='string'||scope.contains(candidateTabScope)) ? candidateTabScope : null;
      const tab=cursor?.matches('[data-keyboard-tab]');
      const tabUtilities=tabScope ? Array.from(tabScope.querySelectorAll<HTMLButtonElement>('[data-keyboard-tab-utility]')).filter(button=>!button.disabled && button.getClientRects().length>0) : [];
      const tabProducts=tabScope && cursor?.closest<HTMLElement>('[data-keyboard-tab-products]');
      if(tabScope && cursor && event.key.startsWith('Arrow') && (tabProducts || cursor.matches('[data-keyboard-tab-utility]'))){
        event.preventDefault();let next:HTMLButtonElement|null|undefined=cursor;
        if(tabProducts){
          const entries=Array.from(tabProducts.querySelectorAll<HTMLButtonElement>('button'));
          const index=entries.indexOf(cursor),cols=getComputedStyle(tabProducts).gridTemplateColumns.split(' ').length;
          const delta=key==='arrowdown'?cols:key==='arrowup'?-cols:key==='arrowright'?1:-1;
          for(let i=index+delta;i>=0 && i<entries.length;i+=delta){
            if(['arrowleft','arrowright'].includes(key) && Math.floor(i/cols)!==Math.floor(index/cols))break;
            if(!entries[i].disabled){next=entries[i];break;}
          }
        }else{
          const index=tabUtilities.indexOf(cursor);
          if(key==='arrowup')next=tabUtilities[index-1] ?? tabScope.querySelector<HTMLButtonElement>('[data-keyboard-tab][aria-pressed=true]');
          else if(key==='arrowdown')next=tabUtilities[index+1] ?? cursor;
        }
        select(next);next?.scrollIntoView({block:'nearest'});return;
      }
      if(tabScope && cursor && tab && ['enter','z'].includes(key)){
        event.preventDefault();cursor.click();requestAnimationFrame(()=>{
          const first=tabScope.querySelector<HTMLButtonElement>('[data-keyboard-tab-panel] [data-keyboard-tab-products] button:not(:disabled):not([aria-disabled=true])') ?? tabScope.querySelector<HTMLButtonElement>('[data-keyboard-tab-panel] button:not(:disabled):not([aria-disabled=true])');
          select(first);first?.scrollIntoView({block:'nearest'});
        });return;
      }
      if(tabScope && cursor && tab && event.key.startsWith('Arrow')){
        event.preventDefault();const tabs=Array.from(tabScope.querySelectorAll<HTMLButtonElement>('[data-keyboard-tab]'));
        if(['arrowleft','arrowright'].includes(key)){const next=tabs[(tabs.indexOf(cursor)+(key==='arrowright'?1:tabs.length-1))%tabs.length];next.click();select(next);}
        else if(key==='arrowdown' && tabUtilities[0]){select(tabUtilities[0]);tabUtilities[0].scrollIntoView({block:'nearest'});}return;
      }
      if(tabScope && key==='x' && !tab){event.preventDefault();effect('cancel');select(tabScope.querySelector<HTMLButtonElement>('[data-keyboard-tab][aria-pressed=true]'));return;}
      if(key==='x' && scope instanceof HTMLDialogElement){event.preventDefault();effect('cancel');scope.dispatchEvent(new Event('cancel',{cancelable:true}));return;}
      if(typeof scope==='string' && callbacks.current.shortcut?.(event,cursor,select))return;
      const editor=cursor?.closest('[data-keyboard-zones]');
      const zone=cursor?.closest<HTMLElement>('[data-keyboard-zone]');
      if(editor && zone && cursor && event.key.startsWith('Arrow')){
        event.preventDefault();
        const slots=editor.querySelector('[data-keyboard-zone=slots]');
        const ownSlot=slots?.querySelector<HTMLButtonElement>('button.selected:not(:disabled)');
        let next:HTMLButtonElement|null|undefined=cursor;
        if(zone.dataset.keyboardZone==='slots'){
          if(key==='arrowdown')next=editor.querySelector<HTMLButtonElement>('[data-keyboard-zone=save] button');
          else if(['arrowleft','arrowright'].includes(key)){const entries=Array.from(slots?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);next=entries[entries.indexOf(cursor)+(key==='arrowright'?1:-1)] ?? cursor;}
        }else if(zone.dataset.keyboardZone==='save'){
          if(key==='arrowup')next=ownSlot;
        }else{
          const entries=Array.from(zone.querySelectorAll<HTMLButtonElement>('button'));
          const position=entries.indexOf(cursor),cols=getComputedStyle(zone).gridTemplateColumns.split(' ').length;
          const delta=key==='arrowdown'?cols:key==='arrowup'?-cols:key==='arrowright'?1:-1;
          for(let i=position+delta;i>=0 && i<entries.length;i+=delta){if(['arrowleft','arrowright'].includes(key) && Math.floor(i/cols)!==Math.floor(position/cols))break;if(!entries[i].disabled){next=entries[i];break;}}
        }
        select(next);next?.scrollIntoView({block:'nearest',inline:'nearest'});
        return;
      }
      if(key==='q'||key==='e'){const tabs=Array.from((target?.closest('[data-tab-scope]')??cursor?.closest('[data-tab-scope]')??(typeof scope==='string'?document:scope)).querySelectorAll<HTMLButtonElement>('[data-game-tabs] button')).filter(button=>!button.disabled && button.getClientRects().length>0);if(tabs.length){event.preventDefault();const index=tabs.findIndex(tab=>tab.getAttribute('aria-selected')==='true'||tab.getAttribute('aria-pressed')==='true'),next=tabs[(Math.max(0,index)+(key==='e'?1:tabs.length-1))%tabs.length];next.click();selectGameCursor(next);next.focus({preventScroll:true});return;}}
      if(key==='enter'||key==='z'){event.preventDefault();cursor?.click();return;}
      if(!event.key.startsWith('Arrow') || !cursor)return;
      event.preventDefault();const items=buttons(scope),index=items.indexOf(cursor);
      if(cursor.matches('[data-keyboard-list-next]') && event.key==='ArrowUp'){
        const previous=items.filter(item=>item.closest('[data-keyboard-list]')).at(-1);select(previous);previous?.scrollIntoView({block:'nearest'});return;
      }
      const list=cursor.closest<HTMLElement>('[data-keyboard-list]');
      if(list) {
        const entries=items.filter(item=>item.closest('[data-keyboard-list]')===list),position=entries.indexOf(cursor);
        const delta=event.key==='ArrowDown' ? 1 : event.key==='ArrowUp' ? -1 : 0;
        const next=event.key==='ArrowDown' && position===entries.length-1 ? (typeof scope==='string'?document:scope).querySelector<HTMLButtonElement>('[data-keyboard-list-next]:not(:disabled)') ?? cursor : entries[Math.max(0,Math.min(entries.length-1,position+delta))];
        select(next);next?.scrollIntoView({block:'nearest',inline:'nearest'});return;
      }
      if(typeof scope==='string'){
        const col=index%columns,delta=event.key==='ArrowDown' ? columns : event.key==='ArrowUp' ? -columns : event.key==='ArrowRight' && col<columns-1 ? 1 : event.key==='ArrowLeft' && col>0 ? -1 : 0;
        select(items[Math.max(0,Math.min(items.length-1,index+delta))]);
      } else {
        const origin=cursor.getBoundingClientRect(),x=origin.x+origin.width/2,y=origin.y+origin.height/2;
        const grid=cursor.closest('[data-keyboard-grid]');
        if(grid && event.key==='ArrowDown' && !items.some(item=>item.closest('[data-keyboard-grid]')===grid && item.getBoundingClientRect().top+item.getBoundingClientRect().height/2>y+2)){
          const next=scope.querySelector<HTMLButtonElement>('[data-keyboard-next]:not(:disabled)');
          if(next){select(next);next.scrollIntoView({block:'nearest',inline:'nearest'});return;}
        }
        if(cursor.matches('[data-keyboard-next]') && event.key==='ArrowUp'){
          const previous=items.filter(item=>item.closest('[data-keyboard-grid]') && item.getAttribute('aria-pressed')==='true').at(-1) ?? items.filter(item=>item.closest('[data-keyboard-grid]')).at(-1);
          if(previous){select(previous);previous.scrollIntoView({block:'nearest',inline:'nearest'});return;}
        }
        const horizontal=['ArrowLeft','ArrowRight'].includes(event.key),positive=['ArrowRight','ArrowDown'].includes(event.key);
        const nearest=items.filter(item=>item!==cursor).map(item=>{const rect=item.getBoundingClientRect(),dx=rect.x+rect.width/2-x,dy=rect.y+rect.height/2-y,along=horizontal ? dx : dy,cross=horizontal ? dy : dx;
          const aligned=horizontal ? rect.top<origin.bottom && rect.bottom>origin.top : rect.left<origin.right && rect.right>origin.left;
          return {item,along,aligned,cost:Math.abs(along)+Math.abs(cross)*3};}).filter(item=>item.aligned && (positive ? item.along>2 : item.along< -2)).sort((a,b)=>Number(b.aligned)-Number(a.aligned) || a.cost-b.cost)[0];
        if(nearest)select(nearest.item);
        nearest?.item.scrollIntoView({block:'nearest',inline:'nearest'});
      }
    }
    const commanded=(event:Event)=>draw((event as CustomEvent<HTMLElement>).detail);
    const pointed=(event:Event)=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button,a[href]');if(button){document.body.dataset.gameInput='cursor';draw(button);}};
    const focused=(event:Event)=>{if(document.body.dataset.gameInput!=='native')return;const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button,a[href]');if(button)draw(button);};
    let queued=false;
    const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;draw();});});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','disabled']});
    document.addEventListener('keydown',handle);document.addEventListener('game-cursor-select',commanded);document.addEventListener('pointerdown',pointed,true);document.addEventListener('focusin',focused);draw();
    return ()=>{observer.disconnect();document.removeEventListener('keydown',handle);document.removeEventListener('game-cursor-select',commanded);document.removeEventListener('pointerdown',pointed,true);document.removeEventListener('focusin',focused);marked.current?.removeAttribute('data-game-cursor');};
  },[selector,columns,enabled]);
}

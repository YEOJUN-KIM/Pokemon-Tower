'use client';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import boundary from './boundary.module.css';
import foundation from './foundation.module.css';
import gameTheme from './game-theme.module.css';
import retroTheme from './retro-theme.module.css';
import gimmicks from './gimmick-theme.module.css';
import tera from './tera-theme.module.css';
import collection from './pokedex-center.module.css';
import editors from './pokedex-editors.module.css';
import focus from './battle-focus.module.css';
import upgrades from './permanent-shop.module.css';
import account from './account.module.css';
import maintenance from './run-maintenance.module.css';
import mobile from './mobile-ui.module.css';
import title from './title-screen.module.css';
import moves from './move-visuals.module.css';
import battle from './battle-layout.module.css';
import settings from './settings-screen.module.css';
import pokedex from './pokedex.module.css';
import health from './battle-health.module.css';
import menu from './game-menu.module.css';

type Screen='title'|'battle'|'pokedex'|'settings'|'upgrades'|'account';

/** One explicit style boundary, including dialogs and embedded collection screens. */
export function ScreenStyles({children}:{children:ReactNode}) {
  const path=usePathname();
  const screen:Screen=path==='/battle'?'battle':path==='/pokedex'?'pokedex':path==='/settings'?'settings':path==='/upgrades'?'upgrades':path==='/account'?'account':'title';
  const classes=[boundary.root,
    foundation.scope,
    menu.scope,
    gameTheme.scope,
    retroTheme.scope,
    gimmicks.scope,
    tera.scope,
    collection.scope,
    editors.scope,
    focus.scope,
    screen==='upgrades' ? upgrades.scope : '',
    screen==='account' ? account.scope : '',
    screen==='battle' ? maintenance.scope : '',
    mobile.scope,
    screen==='title' ? title.scope : '',
    moves.scope,
    screen==='battle' ? battle.scope : '',
    screen==='settings' ? settings.scope : '',
    screen==='battle'||screen==='pokedex' ? pokedex.scope : '',
    screen==='battle' ? health.scope : '',
  ].filter(Boolean).join(' ');
  return <div className={classes} data-ui-screen={screen}>{children}</div>;
}

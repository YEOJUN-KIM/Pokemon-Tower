import type {Page} from '@playwright/test';

export function dexSearch(page:Page) {return {fill:async(value:string)=>{await page.getByRole('searchbox',{name:'검색',exact:true}).fill(value);await page.keyboard.press('Enter');}};}
export function dexFilter(page:Page,title:'표시'|'타입'|'세대') {return {selectOption:async(value:string)=>{const label=value==='all' ? title==='표시' ? '전체' : title==='타입' ? '모든 타입' : '모든 세대' : title==='표시' ? value==='owned' ? '보유' : '미보유' : title==='세대' ? `${value}세대` : value;await page.getByRole('button',{name:`${title} 선택 열기`,exact:true}).click();await page.getByRole('dialog',{name:`${title} 선택`}).getByRole('button',{name:label,exact:true}).click();}};}

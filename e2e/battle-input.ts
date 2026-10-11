import {expect,type Page} from '@playwright/test';

// Open the correct command page before selecting a real battle action.
export async function prepareBattleCommand(page:Page,command:string){
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:20000});
  if(command.startsWith('move ') && !await page.getByTestId('battle-move-menu').isVisible())await page.getByRole('button',{name:'싸운다',exact:true}).click();
  if(command.startsWith('switch ') && !await page.getByTestId('battle-party').isVisible()){
    if(await page.getByRole('button',{name:'돌아가기 · X',exact:true}).isVisible())await page.getByRole('button',{name:'돌아가기 · X',exact:true}).click();
    await page.getByRole('button',{name:'교체',exact:true}).click();
  }
}

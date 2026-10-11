import type {Page} from '@playwright/test';

export async function selectStarters(page:Page) {
  // Wait for the loaded selection screen before choosing its archive/roster path.
  await page.locator('[data-testid="dex-list"], [data-testid="team-selection"]').first().waitFor({state:'visible'});
  for(const name of ['리자몽','거북왕','이상해꽃']) {
    if(await page.getByTestId('dex-list').isVisible()){await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'포켓몬 선택하기',exact:true}).click();}
    else await page.getByRole('button',{name:`${name} 선택`,exact:true}).click();
  }
}

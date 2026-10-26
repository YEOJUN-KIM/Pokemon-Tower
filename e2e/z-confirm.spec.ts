import {test,expect} from '@playwright/test';
for(const width of [1280,390])test('Z opens dex selection/settings, confirms a choice and X cancels at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/pokedex');
 const card=page.getByRole('button',{name:'리자몽 상세 보기',exact:true});await card.click();await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();await expect(page.getByRole('button',{name:'포켓몬 넣기',exact:true})).toBeEnabled();await page.keyboard.press('x');await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(card).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('c');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.keyboard.down('z');await page.keyboard.down('z');await page.keyboard.up('z');
 const menu=page.getByRole('dialog',{name:'리자몽 선택 메뉴'});await expect(menu).toBeVisible();await expect(menu.getByRole('button',{name:'능력치 조정',exact:true})).toBeVisible();await expect(menu.getByRole('button',{name:'기술배치',exact:true})).toBeVisible();await expect(card).not.toHaveClass(/in-party/);
 await page.keyboard.press('z');await expect(menu).toHaveCount(0);await expect(card).toHaveClass(/in-party/);await page.keyboard.press('x');await expect(card).not.toHaveClass(/in-party/);
 await page.keyboard.press('Enter');await expect(menu).toBeVisible();await menu.getByRole('button',{name:'포켓몬 정보',exact:true}).click();await expect(page.getByRole('dialog',{name:'리자몽 기본 정보'})).toBeVisible();await page.keyboard.press('x');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('numbered selection menu shortcuts activate only their item and ignore disabled choices',async({page})=>{
 await page.goto('/pokedex');const card=page.getByRole('button',{name:'리자몽 상세 보기',exact:true}),menu=page.getByRole('dialog',{name:'리자몽 선택 메뉴'});
 await card.click();await page.keyboard.press('1');await expect(menu).toHaveCount(0);await expect(card).toHaveClass(/in-party/);
 await card.click();await expect(menu.getByRole('button',{name:'포켓몬 넣기',exact:true})).toBeDisabled();await page.keyboard.press('1');await expect(menu).toBeVisible();await expect(page.getByTestId('team-preview').locator('.preview-empty')).toHaveCount(2);
 await page.keyboard.down('2');await page.keyboard.down('2');await page.keyboard.up('2');const training=page.getByRole('dialog',{name:'리자몽 능력치 조정'});await expect(training).toBeVisible();
 const points=training.getByLabel('공격 능력 포인트',{exact:true});await points.fill('');await points.press('3');expect(Number(await points.inputValue())).toBe(3);await expect(training).toBeVisible();await training.getByRole('tab',{name:'능력치',exact:true}).click();await page.keyboard.press('x');
 await card.click();await page.keyboard.press('3');await expect(page.getByRole('dialog',{name:'리자몽 기술배치'})).toBeVisible();await page.keyboard.press('x');
 await card.click();await page.keyboard.press('4');await expect(page.getByRole('dialog',{name:'리자몽 기본 정보'})).toBeVisible();await page.keyboard.press('x');
 await card.click();await page.keyboard.press('5');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(card).toHaveClass(/in-party/);
});

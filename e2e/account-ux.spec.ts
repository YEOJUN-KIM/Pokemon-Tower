import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import type {Page} from '@playwright/test';

for(const width of [1280,390])test(`authentication footer links preserve history and next at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const destination='/battle?prepare=1';
  await page.goto('/account?next='+encodeURIComponent(destination));
  await expect(page.getByLabel('아이디',{exact:true})).toBeVisible();
  const card=page.locator('.account-card');
  await expect(card.getByRole('tab')).toHaveCount(0);await expect(card.locator('nav button')).toHaveCount(0);
  const primary=(await card.getByRole('button',{name:'로그인',exact:true}).boundingBox())!,links=(await card.locator('.account-links').boundingBox())!;
  expect(links.y).toBeGreaterThanOrEqual(primary.y+primary.height);
  await page.getByRole('link',{name:'회원가입',exact:true}).click();
  await expect(page.getByRole('heading',{name:'트레이너 회원가입',exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);expect(new URL(page.url()).searchParams.get('mode')).toBe('register');
  await expect(card.locator('.account-links a')).toHaveCount(1);
  await page.goBack();await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
  await page.goForward();await expect(page.getByRole('heading',{name:'트레이너 회원가입',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'로그인',exact:true}).click();
  await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.getByRole('link',{name:'비밀번호 찾기',exact:true}).click();
  await expect(page.getByRole('heading',{name:'비밀번호 찾기',exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.getByLabel('아이디',{exact:true}).fill('navigation_only');await page.getByLabel('계정 복구 키',{exact:true}).fill('navigation-only-key');
  await page.getByRole('button',{name:'계정 확인',exact:true}).click();await expect(page.getByRole('heading',{name:'새 비밀번호',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'로그인으로 돌아가기',exact:true}).click();await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
  await page.goBack();await expect(page.getByRole('heading',{name:'비밀번호 찾기',exact:true})).toBeVisible();
  await expect(page.getByLabel('아이디',{exact:true})).toHaveValue('');
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.goto('/account?mode=unknown');await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
});

function contrast(a:string,b:string){
  const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);
}
async function checkFields(page:Page){
  const fields=page.locator('.account-card input'),button=page.locator('.account-card form .primary-button');
  const buttonColor=await button.evaluate(el=>getComputedStyle(el).backgroundColor);
  for(const field of await fields.all()){
    const before=await field.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,border:s.borderColor};});
    expect(before.background).not.toBe(buttonColor);expect(contrast(before.color,before.background)).toBeGreaterThanOrEqual(4.5);
    await field.focus();await expect(field).toBeFocused();
    const focused=await field.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderColor,shadow:s.boxShadow};});
    expect(focused.background).toBe(before.background);expect(focused.border).not.toBe(before.border);expect(focused.shadow).not.toBe('none');expect(contrast(focused.border,focused.background)).toBeGreaterThanOrEqual(3);
    await field.blur();
  }
}

for(const width of [1280,390])test(`account cards, completion, reset stages and settings at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/');await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
  await expect(page.getByText('영문·숫자·밑줄 3~24자',{exact:true})).toHaveCount(0);
  await checkFields(page);
  const loginWidth=(await page.locator('.account-card').boundingBox())!.width;
  await page.getByLabel('아이디',{exact:true}).focus();
  await page.screenshot({path:`test-results/auth-login-${width}.png`,fullPage:true});
  await expect(page.locator('.account-card nav button')).toHaveCount(0);await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByRole('link',{name:'회원가입',exact:true}).click();
  await expect(page.getByRole('link',{name:'로그인',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'트레이너 회원가입',exact:true})).toBeVisible();
  expect((await page.locator('.account-card').boundingBox())!.width).toBe(loginWidth);
  await expect(page.getByText('영문·숫자·밑줄 3~24자',{exact:true})).toBeVisible();
  await expect(page.getByLabel('기존 저장 복구 코드 (선택)',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'복구 코드 입력하기',exact:true}).click();
  await expect(page.getByLabel('기존 저장 복구 코드 (선택)',{exact:true})).toBeVisible();
  await checkFields(page);await page.getByLabel('기존 저장 복구 코드 (선택)',{exact:true}).focus();
  await page.screenshot({path:`test-results/auth-register-fields-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'복구 코드 입력 닫기',exact:true}).click();
  const username='ux_'+randomUUID().slice(0,8),password='ux-password-123';
  await page.getByLabel('아이디',{exact:true}).fill(username);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByLabel('비밀번호 확인',{exact:true}).fill('different-password');
  await page.getByLabel('비밀번호 확인',{exact:true}).press('Enter');await expect(page.locator('.account-card').getByRole('alert')).toHaveText('비밀번호가 서로 다릅니다.');
  await page.getByLabel('비밀번호 확인',{exact:true}).fill(password);await page.getByLabel('비밀번호 확인',{exact:true}).press('Enter');
  await expect(page.getByRole('heading',{name:'회원가입이 완료되었습니다!',exact:true})).toBeVisible();
  await expect(page.getByText(`${username}님, 환영합니다.`,{exact:true})).toBeVisible();await expect(page.locator('.account-card button')).toHaveCount(1);await expect(page.locator('.account-card a')).toHaveCount(0);
  const key=(await page.locator('.account-recovery code').textContent())!;
  await page.screenshot({path:`test-results/auth-complete-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'게임 시작하기',exact:true}).click();await expect(page.locator('.title-screen')).toBeVisible();
  await page.request.post('/api/tutorial',{headers:{Origin:'http://127.0.0.1:3001'},data:{event:'skip'}});await page.reload();
  await expect(page.locator('.title-account')).toHaveText(`트레이너: ${username}`);await expect(page.locator('.title-account')).toHaveJSProperty('tagName','SPAN');await expect(page.locator('.title-utilities a[href="/account"]')).toHaveCount(0);
  const trainer=page.locator('.title-account'),frame=(await page.locator('.title-stage').boundingBox())!,name=(await trainer.boundingBox())!;
  expect(name.y+name.height).toBeLessThanOrEqual(frame.y+frame.height-16);expect(name.x).toBeGreaterThan(frame.x);expect(name.x+name.width).toBeLessThan(frame.x+frame.width);
  const trainerPaint=()=>trainer.evaluate(el=>{const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,outline:s.outlineStyle,border:s.borderStyle,shadow:s.boxShadow,size:s.fontSize};});
  const normal=await trainerPaint();expect(parseFloat(normal.size)).toBeGreaterThanOrEqual(18);
  await trainer.hover();expect(await trainerPaint()).toEqual(normal);expect(normal.outline).toBe('none');expect(normal.border).toBe('none');
  await page.screenshot({path:`test-results/title-trainer-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'설정',exact:true}).click();await page.getByRole('tab',{name:'배틀 설정',exact:true}).click();await expect(page.getByRole('link',{name:/포켓몬 도감으로 이동/})).toHaveCount(0);
  await page.getByRole('tab',{name:'계정',exact:true}).click();const panel=page.getByRole('tabpanel'),logout=panel.getByRole('button',{name:'로그아웃',exact:true});
  await expect(panel.getByRole('button')).toHaveCount(1);await expect(panel.getByRole('link')).toHaveCount(0);await expect(panel).toContainText(username);
  const nameBox=(await panel.locator('strong').boundingBox())!,logoutBox=(await logout.boundingBox())!;expect(logoutBox.x).toBeGreaterThan(nameBox.x+nameBox.width);
  await page.screenshot({path:`test-results/auth-settings-${width}.png`,fullPage:true});
  await logout.click();await expect(page.getByRole('heading',{name:'트레이너 로그인',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'비밀번호 찾기',exact:true}).click();await expect(page.getByRole('heading',{name:'비밀번호 찾기',exact:true})).toBeVisible();await expect(page.getByLabel('새 비밀번호',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'로그인으로 돌아가기',exact:true})).toBeVisible();
  await checkFields(page);await page.screenshot({path:`test-results/auth-recovery-fields-${width}.png`,fullPage:true});
  expect((await page.locator('.account-card').boundingBox())!.width).toBe(loginWidth);
  await page.getByLabel('아이디',{exact:true}).fill(username);await page.getByLabel('계정 복구 키',{exact:true}).fill(key);await page.getByLabel('계정 복구 키',{exact:true}).press('Enter');
  await expect(page.getByRole('heading',{name:'새 비밀번호',exact:true})).toBeVisible();await expect(page.getByLabel('아이디',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'로그인으로 돌아가기',exact:true})).toBeVisible();
  await checkFields(page);
  await page.getByLabel('새 비밀번호',{exact:true}).focus();
  await page.screenshot({path:`test-results/auth-reset-${width}.png`,fullPage:true});
  await page.getByLabel('새 비밀번호',{exact:true}).fill('changed-password-123');await page.getByLabel('비밀번호 확인',{exact:true}).fill('changed-password-123');await page.getByLabel('비밀번호 확인',{exact:true}).press('Enter');
  await expect(page.getByRole('heading',{name:'비밀번호가 변경되었습니다!',exact:true})).toBeVisible();await expect(page.locator('.account-recovery code')).not.toHaveText(key);
  await page.getByRole('button',{name:'게임 시작하기',exact:true}).click();await expect(page.locator('.title-screen')).toBeVisible();
});

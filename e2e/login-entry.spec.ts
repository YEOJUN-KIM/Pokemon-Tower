import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

for(const width of [1280,390])test(`login first, persistent sign-in and return destination at ${width}`,async({page,browser})=>{
  await page.setViewportSize({width,height:900});
  expect((await page.request.get('/api/account/local')).status()).toBe(404);
  await page.goto('/');
  await expect(page).toHaveURL(/\/account\?next=/);
  await expect(page.getByRole('heading',{name:'트레이너 로그인'})).toBeVisible();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await page.goto('/pokedex');await expect(page).toHaveURL(/next=%2Fpokedex/);
  await page.getByRole('link',{name:'회원가입',exact:true}).click();
  await expect(page.getByRole('heading',{name:'트레이너 회원가입',exact:true})).toBeVisible();
  const username=`entry_${randomUUID().slice(0,8)}`,password='entry-password-123';
  await page.getByLabel('아이디',{exact:true}).fill(username);
  await page.getByLabel('비밀번호',{exact:true}).fill(password);
  await page.getByLabel('비밀번호 확인',{exact:true}).fill(password);
  await page.getByRole('button',{name:'회원가입',exact:true}).last().click();
  await expect(page.getByRole('heading',{name:'계정 복구 키'})).toBeVisible();
  await page.getByRole('button',{name:'게임 시작하기',exact:true}).click();
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
  await page.request.post('/api/tutorial',{headers:{Origin:'http://127.0.0.1:3001'},data:{event:'skip'}});
  await page.goto('/pokedex');
  await expect(page.getByTestId('dex-progress')).toHaveText(/^27 \/ \d+$/);
  const cookies=await page.context().cookies();
  const auth=cookies.find(cookie=>cookie.name==='tower_auth')!;
  expect(auth.expires).toBeGreaterThan(Date.now()/1000+29*86400);
  // Reopening a browser with its persistent cookie skips the login screen.
  const reopened=await browser.newContext({baseURL:'http://127.0.0.1:3001'});
  try {
    await reopened.addCookies(cookies);
    const next=await reopened.newPage();await next.goto('/');
    await expect(next).toHaveURL('http://127.0.0.1:3001/');
    await expect(next.locator('.title-screen')).toBeVisible();
    await next.goto('/account?next=%2Fsettings');await expect(next).toHaveURL(/\/settings$/);
  }finally{await reopened.close();}
  await page.goto('/account');await expect(page).toHaveURL('http://127.0.0.1:3001/');
  await page.goto('/settings');await page.getByRole('tab',{name:'계정',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  await expect(page.getByRole('heading',{name:'트레이너 로그인'})).toBeVisible();
  await page.goto('/battle?prepare=1');await expect(page).toHaveURL(/next=%2Fbattle%3Fprepare%3D1/);
  await page.getByLabel('아이디',{exact:true}).fill(username);
  await page.getByLabel('비밀번호',{exact:true}).fill(password);
  await page.getByRole('button',{name:'로그인',exact:true}).last().click();
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
  await page.getByRole('link',{name:'게임 시작',exact:true}).click();
  await expect(page.getByTestId('team-selection')).toBeVisible();
  await page.screenshot({path:`test-results/login-entry-${width}.png`});
  await page.goto('/account?next=https%3A%2F%2Fexample.com');
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
});

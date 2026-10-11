import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

for(const width of [1280,390])test(`accounts preserve guest save and support another device at ${width}`,async({page,browser})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/account');
  await expect(page.getByRole('heading',{name:'트레이너 로그인'})).toBeVisible();
  const guest=await page.context().cookies();
  const initial=await page.request.get('/api/battle?view=collection').then(r=>r.json());
  expect(initial.tower.unlocked).toHaveLength(27);
  expect((await page.request.post('/api/battle',{headers:{Origin:'http://127.0.0.1:3001'},data:{type:'favorite',species:'Greninja',enabled:true}})).ok()).toBe(true);
  await page.getByRole('button',{name:'회원가입',exact:true}).first().click();
  const username=`t_${randomUUID().slice(0,8)}`;
  await page.getByLabel('아이디',{exact:true}).fill(username);
  await page.getByLabel('비밀번호',{exact:true}).fill('testing-password-123');
  await page.getByLabel('비밀번호 확인',{exact:true}).fill('testing-password-123');
  await page.getByRole('button',{name:'회원가입',exact:true}).last().click();
  await expect(page.getByText(`${username}님으로 로그인했습니다.`)).toBeVisible();
  await expect(page.getByRole('heading',{name:'계정 복구 키'})).toBeVisible();
  const key=await page.locator('.account-recovery code').textContent();
  const before=await page.request.get('/api/battle?view=collection').then(r=>r.json());
  expect(before.tower.favorites).toContain('Greninja');
  const audio={muted:false,musicVolume:27,effectsVolume:54};
  expect((await page.request.post('/api/account',{headers:{Origin:'http://127.0.0.1:3001'},data:{action:'settings',audio}})).ok()).toBe(true);
  await page.screenshot({path:`test-results/account-${width}.png`});
  const device=await browser.newContext({baseURL:'http://127.0.0.1:3001'});
  try {
    const second=await device.newPage();await second.goto('/account');
    await second.getByLabel('아이디',{exact:true}).fill(username);
    await second.getByLabel('비밀번호',{exact:true}).fill('testing-password-123');
    await second.getByRole('button',{name:'로그인',exact:true}).last().click();
    await expect(second.locator('.title-screen')).toBeVisible();
    expect((await device.request.get('/api/battle?view=collection').then(r=>r.json())).tower).toEqual(before.tower);
    expect((await device.request.get('/api/account').then(r=>r.json())).audio).toEqual(audio);
    await page.getByRole('button',{name:'로그아웃',exact:true}).click();
    await expect(page.getByLabel('아이디',{exact:true})).toBeVisible();
    expect((await page.request.get('/api/battle?view=collection').then(r=>r.json())).tower.favorites).not.toContain('Greninja');
    // A retained guest cookie must not bypass login after its save becomes account-owned.
    const anonymous=await browser.newContext({baseURL:'http://127.0.0.1:3001'});
    try {
      await anonymous.addCookies(guest);
      expect((await anonymous.request.get('/api/battle?view=collection').then(r=>r.json())).tower.favorites).not.toContain('Greninja');
    }finally{await anonymous.close();}
    await page.getByRole('button',{name:'비밀번호 찾기'}).click();
    await page.getByLabel('아이디',{exact:true}).fill(username);
    await page.getByLabel('계정 복구 키',{exact:true}).fill(key!);
    await page.getByLabel('새 비밀번호',{exact:true}).fill('new-password-123');
    await page.getByLabel('비밀번호 확인',{exact:true}).fill('new-password-123');
    await page.getByRole('button',{name:'비밀번호 재설정'}).click();
    await expect(page.getByText(`${username}님으로 로그인했습니다.`)).toBeVisible();
    expect((await device.request.get('/api/account').then(r=>r.json())).username).toBeNull();
  }finally{await device.close();}
});

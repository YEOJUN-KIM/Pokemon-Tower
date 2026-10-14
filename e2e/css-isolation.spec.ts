import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('screen styles stay inside their owner during client navigation',async({page})=>{
  await page.goto('/account');
  const response=await page.request.post('/api/account',{headers:{Origin:'http://127.0.0.1:3001'},data:{action:'register',username:`css_${randomUUID().slice(0,8)}`,password:'css-isolation-test-2026'}});
  expect(response.ok()).toBe(true);
  await page.goto('/');
  await page.getByRole('link',{name:'설정',exact:true}).click();
  await expect(page.locator('[data-ui-screen]')).toHaveAttribute('data-ui-screen','settings');
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).toBe('visible');
  const sentinel=async()=>page.evaluate(()=>{
    document.querySelector('#css-sentinel')?.remove();
    const node=document.createElement('div');node.id='css-sentinel';node.className='health-card';node.textContent='Style boundary probe';
    document.querySelector('[data-ui-screen]')!.append(node);
    const css=getComputedStyle(node);return {position:css.position,background:css.backgroundColor,padding:css.padding};
  });
  const expected={position:'static',background:'rgba(0, 0, 0, 0)',padding:'0px'};
  expect(await sentinel()).toEqual(expected);
  await page.getByRole('button',{name:/뒤로가기/}).click();
  await expect(page.locator('[data-ui-screen]')).toHaveAttribute('data-ui-screen','title');
  await page.getByRole('link',{name:/포켓몬 도감/}).first().click();
  await expect(page.locator('[data-ui-screen]')).toHaveAttribute('data-ui-screen','pokedex');
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).toBe('hidden');
  expect(await sentinel()).toEqual(expected);
  // A same-named node outside every module boundary must receive no UI styling.
  const outside=await page.evaluate(()=>{
    const node=document.createElement('div');node.className='health-card primary-button';document.body.append(node);
    const css=getComputedStyle(node),result={position:css.position,background:css.backgroundColor,padding:css.padding};node.remove();return result;
  });
  expect(outside).toEqual(expected);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

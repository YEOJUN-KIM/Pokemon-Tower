import {expect,type Page} from '@playwright/test';

// Current reward flow: event result dialogue ([data-event-confirm]) -> discovery
// (reward-reveal) -> its single action button (확인하기 / 열어보기 / 살펴보기)
// -> short opening -> reward-panel -> 받기. Results without an actual reward
// (nothing found, coin loss) never open the modal.

// Waits for the modal, passes the reveal step when there is one, and returns the reward panel.
export async function openEventReward(page:Page){
 const modal=page.getByTestId('reward-modal');await expect(modal).toBeVisible();
 const reveal=modal.getByTestId('reward-reveal');
 if(await reveal.count()){await reveal.getByRole('button').click();await expect(reveal).toHaveCount(0);}
 const panel=modal.getByTestId('reward-panel');await expect(panel).toBeVisible();
 return panel;
}

export async function claimEventReward(page:Page,expected?:string|RegExp){
 const panel=await openEventReward(page);
 if(expected!==undefined)await expect(panel).toContainText(expected);
 await panel.getByRole('button',{name:'받기',exact:true}).click();await expect(page.getByTestId('reward-modal')).toHaveCount(0);
}

// Challenger / villain encounters open with a short announcement that must be
// confirmed once before the candidate list (or battle start) appears.
export async function passEventIntro(page:Page){
 await expect(page.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
 await page.locator('[data-event-confirm]').click();
}

// After a won event battle: result dialogue -> confirm -> reveal -> reward panel.
export async function openRewardAfterResult(page:Page){
 await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');
 await page.locator('[data-event-confirm]').click();
 return openEventReward(page);
}

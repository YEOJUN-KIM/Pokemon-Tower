import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TowerStore} from '../src/server/tower-store';
import {Accounts,hashToken} from '../src/server/accounts';
import {initialPartners} from '../src/data/teams';

test('all generations start unlocked without changing existing training or wallet',()=>{
  const store=new TowerStore(':memory:');
  try {
    store.ensurePlayer('guest');
    assert.equal(initialPartners.length,27);
    assert.equal(store.view('guest').unlocked.length,27);
    store.db.prepare('UPDATE players SET growth_points=5302 WHERE id=?').run('guest');
    store.ensurePlayer('guest');
    assert.equal(store.view('guest').growthPoints,5302);
    assert.equal(store.view('guest').unlocked.length,27);
  }finally{store.close();}
});
test('registration keeps guest save; password login restores it and logout revokes session',async()=>{
  const store=new TowerStore(':memory:');
  try {
    store.ensurePlayer('guest');store.db.prepare('UPDATE players SET growth_points=5302 WHERE id=?').run('guest');
    const accounts=new Accounts(store.db);
    const created=await accounts.register('Trainer_1','test-password-123','guest','');
    assert.equal(accounts.session(created.token)?.player_id,'guest');
    assert.equal(store.view('guest').growthPoints,5302);
    await assert.rejects(accounts.login('trainer_1','wrong-password'));
    const login=await accounts.login('TRAINER_1','test-password-123');
    assert.equal(accounts.session(login.token)?.player_id,'guest');
    assert.equal(store.db.prepare('SELECT 1 FROM account_sessions WHERE token_hash=?').get(login.token),undefined);
    accounts.logout(login.token);assert.equal(accounts.session(login.token),null);
    store.db.prepare('UPDATE account_sessions SET expires_at=0').run();assert.equal(accounts.session(created.token),null);
  }finally{store.close();}
});
test('one-time save claim requires secret and cannot claim an account-owned save',async()=>{
  const store=new TowerStore(':memory:');
  try {
    store.ensurePlayer('original');store.ensurePlayer('newguest');
    const accounts=new Accounts(store.db);
    store.db.prepare('INSERT INTO save_claims VALUES (?,?,?)').run(hashToken('private-save-code'),'original',Date.now()+60000);
    await assert.rejects(accounts.register('first','test-password-123','newguest','invalid'));
    const claim=await accounts.register('first','test-password-123','newguest','private-save-code');
    assert.equal(accounts.session(claim.token)?.player_id,'original');
    await assert.rejects(accounts.register('second','test-password-123','newguest','private-save-code'));
    await assert.rejects(accounts.register('third','test-password-123','original',''));
    assert.equal((store.db.prepare('SELECT count(*) n FROM accounts').get() as {n:number}).n,1);
  }finally{store.close();}
});
test('account recovery rotates key, changes password and invalidates previous sessions',async()=>{
  const store=new TowerStore(':memory:');
  try {
    const accounts=new Accounts(store.db);
    const created=await accounts.register('trainer','test-password-123','guest','');
    await assert.rejects(accounts.reset('trainer','new-password-123','invalid'));
    const recovered=await accounts.reset('trainer','new-password-123',created.recoveryKey);
    assert.equal(accounts.session(created.token),null);
    assert.notEqual(recovered.recoveryKey,created.recoveryKey);
    await assert.rejects(accounts.reset('trainer','third-password-123',created.recoveryKey));
    await assert.rejects(accounts.login('trainer','test-password-123'));
    assert.equal((await accounts.login('trainer','new-password-123')).username,'trainer');
  }finally{store.close();}
});
test('failed logins are throttled',async()=>{
  const store=new TowerStore(':memory:');
  try {
    const accounts=new Accounts(store.db);
    for(let i=0;i<10;i++)await assert.rejects(accounts.login('missing','wrong-password'));
    await assert.rejects(accounts.login('missing','wrong-password'),/시도가 너무 많습니다/);
  }finally{store.close();}
});

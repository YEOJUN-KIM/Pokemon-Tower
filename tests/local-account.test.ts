import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localAccountUsername} from '../src/server/local-account';
test('local automatic sign-in requires development, an explicit account and a loopback host without a proxy',()=>{
 const oldMode=process.env.NODE_ENV,oldAccount=process.env.TOWER_LOCAL_ACCOUNT;
 try{
  Object.assign(process.env,{NODE_ENV:'development'});process.env.TOWER_LOCAL_ACCOUNT='local_trainer';
  for(const host of ['127.0.0.1:3000','localhost:3000','[::1]:3000'])assert.equal(localAccountUsername(new Headers({host})),'local_trainer');
  for(const host of ['game.example.com','192.168.0.1:3000','localhost.example.com','127.0.0.1.attacker.test'])assert.equal(localAccountUsername(new Headers({host})),null);
  for(const key of ['forwarded','x-forwarded-host','x-forwarded-for'])assert.equal(localAccountUsername(new Headers({host:'localhost:3000',[key]:'example.com'})),null);
  Object.assign(process.env,{NODE_ENV:'production'});assert.equal(localAccountUsername(new Headers({host:'localhost:3000'})),null);
  Object.assign(process.env,{NODE_ENV:'development'});delete process.env.TOWER_LOCAL_ACCOUNT;assert.equal(localAccountUsername(new Headers({host:'localhost:3000'})),null);
 }finally{if(oldMode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:oldMode});if(oldAccount===undefined)delete process.env.TOWER_LOCAL_ACCOUNT;else process.env.TOWER_LOCAL_ACCOUNT=oldAccount;}
});

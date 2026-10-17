import test from 'node:test';
import assert from 'node:assert/strict';
import {portalActivationDuration} from '../src/web/portal-effects';

test('portal charge stays brief but readable at 1x/2x/4x, with a quiet reduced-motion alternative',()=>{
 assert.equal(portalActivationDuration(1,false),720);
 assert.equal(portalActivationDuration(2,false),400);
 assert.equal(portalActivationDuration(4,false),400);
 for(const speed of [1,2,4])assert.equal(portalActivationDuration(speed,true),120);
});

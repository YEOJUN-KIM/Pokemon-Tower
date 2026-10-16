import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const src=fileURLToPath(new URL('../src/',import.meta.url));

test('game, data, server and shared modules do not depend on UI implementation',()=>{
  const violations:string[]=[];
  function inspect(directory:string){
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory()){inspect(path);continue;}
      if(!/\.tsx?$/.test(entry.name))continue;
      const source=readFileSync(path,'utf8');
      for(const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){
        const target=resolve(directory,match[2]);
        if(relative(join(src,'web'),target).split(/[\\/]/)[0]!=='..')violations.push(`${relative(src,path)} → ${match[2]}`);
      }
    }
  }
  for(const folder of ['data','battle','server','shared','game'])inspect(join(src,folder));
  assert.deepEqual(violations,[],`UI dependency crosses the game boundary: ${violations.join(', ')}`);
});

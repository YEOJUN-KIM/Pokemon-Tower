import {normalNpcFloorRules,normalNpcStageRange,normalNpcCategory} from '../src/data/normal-mode-stages.ts';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
const workspaceModules=join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules');
const runtimeRequire=createRequire(join(workspaceModules,'npc-csv-entry.cjs'));
const {Workbook}=await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const inputDir='scripts/data/npc/';
const outputDir='artifacts/reports/npc/';
await fs.mkdir(outputDir,{recursive:true});
const data=JSON.parse(await fs.readFile(inputDir+(process.argv[2] ?? 'npc-team-samples.json'),'utf8'));
const prefix=process.argv[3] ?? 'npc-team';
const stats=['hp','atk','def','spa','spd','spe'];
const summary=[['schema_version','mode','sample_id','npc_id','stage_id','sample_tier','npc_category','generation','reference_floor','min_floor','max_floor','gimmick_min_floor','gimmick_enabled','gimmick_type','carrier_species','ace_species','legendary_min_floor','level','iv_cap','total_stat_points','max_stat_points','species_1','species_2','species_3','candidate_count','species_4','species_5','species_6']];
const detail=[['schema_version','sample_id','npc_id','slot','species','item','ability','nature','tera_type','gigantamax','is_ace','is_carrier','move_1','move_2','move_3','move_4',...stats.map(k=>'iv_'+k),...stats.map(k=>'points_'+k),'form_species','form_ability','form_types']];
const ids=new Set();
for(const s of [...data.samples].sort((a,b)=>a.id.localeCompare(b.id)||(a.sampleTier??0)-(b.sampleTier??0))){
 const staged=!!s.stage,active=s.gimmickEnabled!==false,id=s.id+':'+(s.allFloors?'all':s.stage??'reference-max');
 assert.ok(!ids.has(id),'Duplicate sample: '+id);ids.add(id);
 assert.equal(new Set(s.team.map(p=>p.species)).size,s.team.length);
 assert.ok(s.allFloors?s.team.length>=3&&s.team.length<=6:s.team.length===3);
 assert.ok(!s.ace||s.team.some(p=>p.species===s.ace));
 assert.ok(!s.signature||s.team.some(p=>p.species===s.signature.species));
 const category=normalNpcCategory(s.role,s.id,'named');
 const villainBoss=s.role==='villain'&&!s.id.includes('-executive-');
 const range=!staged||s.allFloors?[1,normalNpcFloorRules.finalGate]:villainBoss?(s.sampleTier===1?[0,0]:[normalNpcFloorRules.villainBoss,normalNpcFloorRules.finalGate]):normalNpcStageRange(s.stage);
 const gimmickFloor=!staged||!active?0:!s.allFloors&&villainBoss?normalNpcFloorRules.villainBoss:category==='boss'?normalNpcFloorRules.firstGate:normalNpcFloorRules.lateLeaders;
 const points=s.statPoints??data.statPoints??Math.max(...s.team.map(p=>stats.reduce((n,k)=>n+p.profile.evs[k],0)));
 const iv=s.iv??data.iv??Math.max(...s.team.flatMap(p=>stats.map(k=>p.profile.ivs[k])));
 summary.push([2,staged?'normal':'reference',id,s.id,s.allFloors?'all':s.stage??'reference-max',s.sampleTier??0,category,s.generation??0,s.referenceFloor??data.floor??0,...range,gimmickFloor,Number(active),active?s.signature.rule:'none',active?s.signature.species:'',s.ace,s.legendaryMinFloor??0,data.level,iv,points,data.maxPointsPerStat,...Array.from({length:3},(_,i)=>s.team[i]?.species??''),s.team.length,...Array.from({length:3},(_,i)=>s.team[i+3]?.species??'')]);
 for(const [i,p] of s.team.entries()){
  const f=p.profile;
  assert.equal(f.moves.length,4);
  const total=stats.reduce((n,k)=>n+f.evs[k],0);
  if(s.allFloors)assert.ok(total<=66);else assert.equal(total,s.statPoints??data.statPoints);
  for(const k of stats){assert.ok(Number.isInteger(f.ivs[k])&&f.ivs[k]>=0&&f.ivs[k]<=31);assert.ok(Number.isInteger(f.evs[k])&&f.evs[k]>=0&&f.evs[k]<=data.maxPointsPerStat);}
  assert.ok(active||!p.gigantamax);
  detail.push([2,id,s.id,i+1,p.species,p.item,f.ability,f.nature,f.teraType??'',Number(!!p.gigantamax),Number(p.species===s.ace),Number(active&&p.species===s.signature.species),...f.moves,...stats.map(k=>f.ivs[k]),...stats.map(k=>f.evs[k]),p.battleForm?.species??'',p.battleForm?.ability??'',p.battleForm?.types.join('/')??'']);
 }
}
for(const [file,sheetName,matrix] of [[prefix+'-summary.csv','Summary',summary],[prefix+'-details.csv','Details',detail]]){
 const width=matrix[0].length;assert.ok(matrix.every(row=>row.length===width));
 const wb=Workbook.create(),sheet=wb.worksheets.add(sheetName);
 const range=sheet.getRangeByIndexes(0,0,matrix.length,width);range.values=matrix;wb.recalculate();assert.deepEqual(range.values,matrix);
 const csv='\uFEFF'+range.values.map(row=>row.map(value=>typeof value==='number'?String(value):'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
 await fs.writeFile(outputDir+file,csv,'utf8');
 const saved=await fs.readFile(outputDir+file,'utf8');assert.equal(saved.charCodeAt(0),0xFEFF);
 const imported=await Workbook.fromCSV(saved.slice(1),{sheetName:'Verify'});
 const cells=imported.worksheets.getItemAt(0).getRangeByIndexes(0,0,matrix.length,width).values;
 assert.deepEqual(cells,matrix.map(row=>row.map(value=>String(value))));
 console.log(file+': '+(matrix.length-1)+' records, '+width+' columns; all fields round-trip verified.');
}

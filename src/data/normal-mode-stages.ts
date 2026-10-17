export const normalNpcFloorRules={firstGate:50,lateLeaders:55,villainBoss:75,finalGate:100} as const;
export type NormalNpcCategory='leader'|'boss'|'executive'|'elite'|'normal';
export const normalModeStages={
 'leaders-early':{name:'전반 관장·사천왕',sampleTier:1,referenceFloor:45,gimmicks:false},
 'first-gate':{name:'50층 첫 관문',sampleTier:1,referenceFloor:normalNpcFloorRules.firstGate,gimmicks:true},
 'leaders-late':{name:'후반 관장·사천왕',sampleTier:2,referenceFloor:95,gimmicks:true},
 'final-gate':{name:'100층 최종 관문',sampleTier:2,referenceFloor:normalNpcFloorRules.finalGate,gimmicks:true},
} as const;
export type NormalModeStage=keyof typeof normalModeStages;
export function normalNpcCategory(role?:string,id='',kind?:string):NormalNpcCategory{
 if(kind==='normal')return 'normal';
 if(id.includes('-executive-'))return 'executive';
 if(role==='champion' || role==='villain')return 'boss';
 if(kind==='elite')return 'elite';
 return 'leader';
}
export function normalNpcStage(floor:number,category:NormalNpcCategory):NormalModeStage{
 if(!Number.isInteger(floor)||floor<1||floor>normalNpcFloorRules.finalGate)throw Error('Invalid normal-mode floor');
 if(category==='boss')return floor>=normalNpcFloorRules.finalGate?'final-gate':'first-gate';
 return floor>=normalNpcFloorRules.lateLeaders?'leaders-late':'leaders-early';
}
export function normalNpcGimmicksEnabled(floor:number,category:NormalNpcCategory){
 // 50 is the first champion gate; 51–54 remain the breathing-space opening.
 return category!=='normal' && floor>=(category==='boss'?normalNpcFloorRules.firstGate:normalNpcFloorRules.lateLeaders);
}

// Runtime and review/export tools share the same staged sample boundaries.
export function normalNpcStageRange(stage:NormalModeStage):readonly [number,number]{
 switch(stage){
  case 'leaders-early':return [1,normalNpcFloorRules.lateLeaders-1];
  case 'leaders-late':return [normalNpcFloorRules.lateLeaders,normalNpcFloorRules.finalGate];
  case 'first-gate':return [1,normalNpcFloorRules.finalGate-1];
  case 'final-gate':return [normalNpcFloorRules.finalGate,normalNpcFloorRules.finalGate];
 }
}

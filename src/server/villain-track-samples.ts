import {organizationGrunt,villainLeaders} from '../data/villain-organizations';
import {namedTrainerSamples,type TrainerSample} from '../data/trainer-catalog';
// Resolve reviewed IDs without adding any trainer or team definitions.
export function villainTrackSample(id:string):TrainerSample{
 if(id.endsWith('-grunt'))return organizationGrunt(id.slice(0,-6));
 const named=namedTrainerSamples.find(s=>s.id===id);if(named)return named;
 for(const [org,leaders] of Object.entries(villainLeaders))for(const source of [leaders.executive,...leaders.executives??[],leaders.boss]){
  if(source.id===id||`${org}-executive-${source.portrait}`===id||`${org}-boss-${source.portrait}`===id)return {...source,id};
 }
 throw Error(`Missing existing villain sample: ${id}`);
}

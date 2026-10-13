import type {NpcGimmick} from './npc-gimmicks';

// Highest-tier source rosters; exported as staged live templates by the builders.
export const npcReviewPresets:Record<string,{entries:string[];ace:string;signature?:NpcGimmick;legendaryMinFloor?:number}>={
 'named-giovanni':{entries:['Mewtwo','Rhyperior','Kangaskhan'],ace:'Mewtwo',signature:{rule:'mega',species:'Kangaskhan',item:'Kangaskhanite'},legendaryMinFloor:75},
 'named-lance':{entries:['Dragonite','Charizard','Gyarados'],ace:'Dragonite'},
 'named-cynthia':{entries:['Garchomp','Spiritomb','Lucario'],ace:'Garchomp'},
 'named-maxie':{entries:['Groudon','Camerupt','Crobat'],ace:'Groudon',signature:{rule:'primal',species:'Groudon',item:'Red Orb'},legendaryMinFloor:75},
 'named-archie':{entries:['Kyogre','Sharpedo','Crobat'],ace:'Kyogre',signature:{rule:'primal',species:'Kyogre',item:'Blue Orb'},legendaryMinFloor:75},
 // Organization-themed tower adaptations, rather than original-game teams.
 'named-cyrus':{entries:['Dialga','Weavile','Crobat'],ace:'Dialga',signature:{rule:'z',species:'Weavile',item:'Darkinium Z'},legendaryMinFloor:75},
 'named-ghetsis':{entries:['Kyurem','Hydreigon','Cofagrigus'],ace:'Kyurem',signature:{rule:'z',species:'Hydreigon',item:'Dragonium Z'},legendaryMinFloor:75},
 'named-lysandre':{entries:['Yveltal','Gyarados','Pyroar'],ace:'Yveltal',signature:{rule:'mega',species:'Gyarados',item:'Gyaradosite'},legendaryMinFloor:75},
 'named-lusamine':{entries:['Nihilego','Clefable','Milotic'],ace:'Nihilego',signature:{rule:'z',species:'Clefable',item:'Fairium Z'},legendaryMinFloor:75},
 'named-rose':{entries:['Eternatus','Copperajah','Magnezone'],ace:'Eternatus',signature:{rule:'dynamax',species:'Copperajah',item:'Dynamax Band'},legendaryMinFloor:75},
 'named-iris':{entries:['Haxorus','Hydreigon','Lapras'],ace:'Haxorus',signature:{rule:'z',species:'Haxorus',item:'Dragonium Z'}},
 'named-kiawe':{entries:['Marowak-Alola','Turtonator','Salazzle'],ace:'Marowak-Alola'},
 'named-kukui':{entries:['Incineroar','Ninetales-Alola','Braviary'],ace:'Incineroar'},
 'named-hau':{entries:['Primarina','Raichu-Alola','Crabominable'],ace:'Primarina'},
 'named-opal':{entries:['Alcremie','Weezing-Galar','Togekiss'],ace:'Alcremie'},
 'named-melony':{entries:['Lapras','Darmanitan-Galar','Frosmoth'],ace:'Lapras'},
 'named-bede':{entries:['Hatterene','Rapidash-Galar','Gardevoir'],ace:'Hatterene'},
};
// Comparison samples below the legendary threshold keep ordinary partners.
export const npcEarlyReplacements:Record<string,{species:string;replacement:string;ace:string;signature:NpcGimmick}>={
 'named-giovanni':{species:'Mewtwo',replacement:'Nidoqueen',ace:'Rhyperior',signature:{rule:'mega',species:'Kangaskhan',item:'Kangaskhanite'}},
 'named-maxie':{species:'Groudon',replacement:'Claydol',ace:'Camerupt',signature:{rule:'mega',species:'Camerupt',item:'Cameruptite'}},
 'named-archie':{species:'Kyogre',replacement:'Walrein',ace:'Sharpedo',signature:{rule:'mega',species:'Sharpedo',item:'Sharpedonite'}},
 'named-cyrus':{species:'Dialga',replacement:'Honchkrow',ace:'Weavile',signature:{rule:'z',species:'Weavile',item:'Darkinium Z'}},
 'named-ghetsis':{species:'Kyurem',replacement:'Eelektross',ace:'Hydreigon',signature:{rule:'z',species:'Hydreigon',item:'Dragonium Z'}},
 'named-lysandre':{species:'Yveltal',replacement:'Mienshao',ace:'Gyarados',signature:{rule:'mega',species:'Gyarados',item:'Gyaradosite'}},
 'named-lusamine':{species:'Nihilego',replacement:'Bewear',ace:'Clefable',signature:{rule:'z',species:'Clefable',item:'Fairium Z'}},
 'named-rose':{species:'Eternatus',replacement:'Escavalier',ace:'Copperajah',signature:{rule:'dynamax',species:'Copperajah',item:'Dynamax Band'}},
};
export function canonicalNpcId(id:string){return id.startsWith('named-')?id:'named-'+id.replace(/^[^-]+-(?:executive|boss)-/,'');}

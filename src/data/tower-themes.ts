const named=(ids:string)=>ids.split(',').map(id=>`named-${id}`);
export const towerThemes={
 kanto:{hiddenBoss:true,name:'관동',generation:1,gyms:named('brock,misty,ltsurge,erika,koga-kanto,sabrina,blaine,giovanni-gym'),elites:named('lorelei,bruno-kanto,agatha,lance-kanto'),champion:'named-blue',final:'named-red-kanto',organizations:['rocket']},
 johto:{hiddenBoss:true,name:'성도',generation:2,gyms:named('falkner,bugsy,whitney,morty,chuck,jasmine,pryce,clair'),elites:named('will,koga,bruno,karen'),champion:'named-lance',final:'named-red',organizations:['rocket']},
 hoenn:{name:'호연',generation:3,gyms:named('roxanne,brawly,wattson,flannery,norman,winona,tateandliza,wallace-gym,juan'),elites:named('sidney,phoebe,glacia,drake'),champion:'named-steven',final:'named-wallace',organizations:['magma','aqua']},
 sinnoh:{name:'신오',generation:4,gyms:named('roark,gardenia,maylene,crasherwake,fantina,byron,candice,volkner'),elites:named('aaron,bertha,flint,lucian'),champion:'named-cynthia',final:'named-barry',organizations:['galactic']},
 unova:{hiddenBoss:true,name:'하나',generation:5,gyms:named('cilan,chili,cress,lenora,burgh,elesa,clay,skyla,brycen,drayden,cheren,roxie,marlon'),elites:named('shauntal,marshal,grimsley,caitlin,alder'),champion:'named-iris',final:'named-n',organizations:['plasma']},
 kalos:{name:'칼로스',generation:6,gyms:named('viola,grant,korrina,ramos,clemont,valerie,olympia,wulfric'),elites:named('malva,siebold,wikstrom,drasna'),champion:'named-diantha',final:'named-serena',organizations:['flare']},
 alola:{name:'알로라',generation:7,gyms:named('ilima,lana,kiawe,mallow,sophocles,mina,nanu,hapu'),elites:named('hala,molayne,olivia,acerola,kahili'),champion:'named-kukui',final:'named-hau',organizations:['skull','aether']},
 galar:{name:'가라르',generation:8,gyms:named('nessa,kabu,bea,allister,gordie,melony,marnie,bede,raihan'),elites:named('marnie,bede,raihan'),champion:'named-leon',final:'named-leon',organizations:['macrocosmos']},
 paldea:{name:'팔데아',generation:9,gyms:named('katy,brassius,iono,kofu,larry,ryme,tulip,grusha'),elites:named('rika,poppy,larry-elite,hassel'),champion:'named-geeta',final:'named-nemona',organizations:['star']},
} as const;
export type TowerTheme=keyof typeof towerThemes;
export function isTowerTheme(value:unknown):value is TowerTheme{return typeof value==='string' && Object.hasOwn(towerThemes,value);}
export function themeLabel(theme:TowerTheme|null|undefined){return theme?`${towerThemes[theme].name} · ${towerThemes[theme].generation}세대 테마`:'도전 진행';}
export function themeTicket(key:string){let hash=2166136261;for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619);hash=Math.imul(hash^(hash>>>16),0x85ebca6b);hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);return ((hash^(hash>>>16))>>>0)/4294967296;}
// Chosen once from a cryptographically random run ID, then persisted with the run.
export function randomTowerTheme(runId:string):TowerTheme{const themes=Object.keys(towerThemes) as TowerTheme[];return themes[Math.floor(themeTicket(`theme:${runId}`)*themes.length)];}
export function secondTowerTheme(runId:string,first:TowerTheme):TowerTheme{const themes=(Object.keys(towerThemes) as TowerTheme[]).filter(theme=>theme!==first);return themes[Math.floor(themeTicket(`theme:${runId}:chapter:2`)*themes.length)];}

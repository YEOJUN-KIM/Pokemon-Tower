import data from './selectable-forms.json' with {type:'json'};
import type {StatBlock} from './training';
export type SelectableForm={id:number;nationalId:number;baseSpecies:string;name:string;region?:string;regionLabel?:string;generation:number;types:string[];displayTypes:string[];ability:string;abilities:string[];baseStats:StatBlock;heightm:number;bst:number;legendary:boolean;mythical:boolean;requiredItem?:string;moves:string[];selfMoves:string[];legalMoves:string[];collection:'separate'|'family'};
export const selectableForms=data as Record<string,SelectableForm>;
export function collectionSpecies(species:string){
 if(species==='Tauros-Paldea')return 'Tauros-Paldea-Combat';
 const form=selectableForms[species];
 return form?.collection==='family'?form.baseSpecies:species;
}
export function dynamaxDisplaySpecies(species:string,gmax:boolean){
 const normal=species.replace(/-Gmax$/,'');
 return gmax?normal+'-Gmax':normal;
}
export const familyForms=(name:string)=>Object.entries(selectableForms).filter(([,form])=>form.collection==='family'&&form.baseSpecies===name);
export function baseFormName(species:string,name:string){return ({Urshifu:'우라오스 일격의 태세',Ogerpon:'오거폰 벽록의 가면','Tauros-Paldea-Combat':'켄타로스 컴뱃종'} as Record<string,string>)[species]??name;}
export function selectedForm(name:string,forme?:string){const form=forme?selectableForms[forme]:undefined;return form?.collection==='family'&&form.baseSpecies===name?form:undefined;}
export const separateForms=Object.fromEntries(Object.entries(selectableForms).filter(([,form])=>form.collection==='separate'));

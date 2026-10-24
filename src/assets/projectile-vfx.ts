import {assetPaths} from './paths';

// Roles describe reusable shapes, never Pokemon move names. Original filenames
// remain unchanged; source/license/hash evidence lives beside the source pack.
// Reviewed / Rejected for primary battle VFX: style mismatch with the Pokemon
// battle scene, not a licensing or implementation defect. Candidate catalog
// only; no move plan or battle preload may select this pack.
export const projectileVfxCatalog={
 Projectile_Energy_Small:{file:'Arcane Bolt.png',frames:6,category:'Energy',small:true,direction:'right',sourceFrameDurationMs:null},
 Projectile_Energy_Orb:{file:'Magic Orb.png',frames:6,category:'Energy',small:false,direction:'radial',sourceFrameDurationMs:100},
 Projectile_Elemental_Fire:{file:'Fireball.png',frames:6,category:'Energy',small:false,direction:'right',sourceFrameDurationMs:100},
 Projectile_Solid_Rock:{file:'Rock Sling.png',frames:1,category:'Solid',small:false,direction:'radial',sourceFrameDurationMs:100},
 Projectile_Solid_Ice:{file:'Ice Lance.png',frames:4,category:'Solid',small:true,direction:'right',sourceFrameDurationMs:100},
 Projectile_Liquid_Small:{file:'Water Bolt.png',frames:6,category:'Liquid',small:true,direction:'right',sourceFrameDurationMs:100},
 Projectile_Liquid_Blast:{file:'Water Blast.png',frames:6,category:'Liquid',small:false,direction:'right',sourceFrameDurationMs:100},
 Projectile_Elemental_Wind:{file:'Wind Bolt.png',frames:6,category:'Energy',small:true,direction:'right',sourceFrameDurationMs:100},
} as const;
export type ProjectileVfxRole=keyof typeof projectileVfxCatalog;

// Reference lookup only: no preload, fetch or battle fallback changes.
export function projectileVfx(role:string){
 if(!Object.hasOwn(projectileVfxCatalog,role))return null;
 const asset=projectileVfxCatalog[role as ProjectileVfxRole];
 return {...asset,role:role as ProjectileVfxRole,url:assetPaths.projectileEffect(asset.file),frameWidth:16,frameHeight:16,columns:asset.frames,rows:1,
  suggestedFrameDurationMs:100,sourceLoop:null,suggestedPlayback:asset.frames===1?'hold' as const:'repeat-during-flight' as const};
}

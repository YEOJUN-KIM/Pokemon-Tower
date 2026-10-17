// Portal-only timing and strength controls. No global animation state.
export const portalEffects={
 asset:'/images/events/teleport-portal.png',
 idleRotationMs:22000,pulseMs:3200,fragmentMs:4100,
 activateMs:720,fastActivateMs:400,reducedActivateMs:120,
 pulseOpacity:.24,chargedOpacity:.52,fragmentDriftPx:1.5,
} as const;
export function portalActivationDuration(speed:number,reducedMotion:boolean){
 return reducedMotion?portalEffects.reducedActivateMs:Math.max(portalEffects.fastActivateMs,portalEffects.activateMs/speed);
}

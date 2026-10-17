import type {CSSProperties} from 'react';
import styles from './styles/teleport-portal.module.css';
import {portalEffects} from './portal-effects';
export function TeleportPortal({activationMs,arrived=false}:{activationMs?:number;arrived?:boolean}){
 const variables={
  '--portal-rotation':`${portalEffects.idleRotationMs}ms`,'--portal-pulse':`${portalEffects.pulseMs}ms`,
  '--portal-fragment':`${portalEffects.fragmentMs}ms`,'--portal-activate':`${activationMs??portalEffects.activateMs}ms`,
  '--portal-pulse-opacity':portalEffects.pulseOpacity,'--portal-charge-opacity':portalEffects.chargedOpacity,
  '--portal-drift':`${portalEffects.fragmentDriftPx}px`,
 } as CSSProperties;
 return <div className={styles.portal} style={variables} data-testid="teleport-portal" data-phase={arrived?'arrived':activationMs?'activate':'idle'} role="img" aria-label="수상한 순간이동 포탈">
  <span className={styles.aura} aria-hidden="true"/>
  <img className={styles.sprite} src={portalEffects.asset} width="512" height="512" alt="" draggable="false"/>
  <span className={styles.energy} aria-hidden="true"/>
  <span className={styles.fragments} aria-hidden="true"><i/><i/><i/><i/></span>
  <span className={styles.flash} aria-hidden="true"/>
 </div>;
}

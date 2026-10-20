import type {CSSProperties} from 'react';
import {raidCategoryPresentation,type RaidEventView} from '../data/raids';
import {PokemonImage} from './pokemon-image';
import styles from './styles/raid.module.css';

export function RaidVictoryScene({raid}:{raid:RaidEventView}){
 return <section className={`${styles.scene} ${styles.encounter}`} data-event-target data-testid="raid-victory" aria-label="레이드 승리"><PokemonImage id={raid.spriteId} name="레이드 포켓몬" width={180} height={180} fallback={<span>◇</span>}/></section>;
}

export function RaidScene({raid}:{raid:RaidEventView}){
 return <section className={`${styles.scene} ${styles.encounter}`} data-event-target data-testid="raid-encounter" aria-label="정체불명의 강적" data-category={raid.category} style={{'--raid-aura':raidCategoryPresentation[raid.category].aura} as CSSProperties}>
  <h2>정체불명의 강적</h2>
  <div className={styles.art}><div className={styles.aura} data-testid="raid-aura" aria-hidden="true"/>
   <div className={styles.silhouette} data-testid="raid-silhouette"><PokemonImage id={raid.spriteId} name="정체불명의 포켓몬" width={180} height={180} fallback={<span>?</span>}/></div>
  </div>
  <strong>보상: 특별한 보상</strong>
 </section>;
}

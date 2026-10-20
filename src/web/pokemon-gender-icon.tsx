import {genderNames,type PokemonGender} from '../data/gender';
import styles from './styles/pokemon-gender-icon.module.css';
export function PokemonGenderIcon({gender}:{gender?:PokemonGender}){
 if(!gender||gender==='N')return null;
 return <span className={styles.icon} data-pokemon-gender={gender} role="img" aria-label={genderNames[gender]}>{gender==='M'?'♂':'♀'}</span>;
}

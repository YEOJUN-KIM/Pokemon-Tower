'use client';
import type {ComponentProps} from 'react';
import {GameChoice,GamePrice} from './game-menu';

// Checkpoint shops and event shops share the same card surface and controls.
export function ShopProduct({className='',price,children,...props}:ComponentProps<'button'>&{price:number}){
 return <GameChoice {...props} className={`shop-product ${className}`}><span className="shop-product-info">{children}</span><GamePrice amount={price}/></GameChoice>;
}

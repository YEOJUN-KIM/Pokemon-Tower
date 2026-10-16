import type {ComponentProps} from 'react';

// Checkpoint shops and event shops share the same card surface and controls.
export function ShopProduct({className='',...props}:ComponentProps<'div'>){
 return <div {...props} className={`shop-product ${className}`}/>;
}

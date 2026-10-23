// Loading optional art must always settle, including a stalled or failed request.
export function loadAssetImage(url:string,{timeoutMs=5000,imageFactory=()=>new Image()}:{timeoutMs?:number;imageFactory?:()=>HTMLImageElement}={}):Promise<HTMLImageElement|null>{
  return new Promise(resolve=>{
    let image:HTMLImageElement;
    try{image=imageFactory();}catch{resolve(null);return;}
    let settled=false;
    const finish=(value:HTMLImageElement|null)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;resolve(value);};
    const timer=setTimeout(()=>finish(null),timeoutMs);
    image.onload=()=>finish(image.naturalWidth>0?image:null);
    image.onerror=()=>finish(null);
    try{image.src=url;}catch{finish(null);}
  });
}

/** @param {import('node:stream').Readable} input @param {number} timeoutMs */
export function waitForManagedStart(input=process.stdin,timeoutMs=10000){
 return new Promise(resolve=>{
  let command='',settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);input.removeListener('readable',read);input.removeListener('end',closed);input.removeListener('error',closed);input.pause();resolve(value);};
  const closed=()=>finish(false);
  // Read only the handshake bytes, leaving an early stop command buffered for the launcher.
  const read=()=>{let byte;while((byte=input.read(1))!==null){const char=byte.toString();if(char==='\n'){finish(command==='start');return;}if(char!=='\r')command+=char;if(command.length>16){finish(false);return;}}};
  const timer=setTimeout(closed,timeoutMs);
  input.on('readable',read);input.once('end',closed);input.once('error',closed);read();
 });
}

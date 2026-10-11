// Automatic sign-in is opt-in and only available on loopback development hosts.
export function localAccountUsername(requestHeaders:Pick<Headers,'get'>) {
  const username=process.env.TOWER_LOCAL_ACCOUNT;
  if(process.env.NODE_ENV!=='development'||!username)return null;
  const host=requestHeaders.get('host');
  if(!host||!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host))return null;
  // Next itself adds forwarded headers for direct loopback requests.
  if(requestHeaders.get('forwarded'))return null;
  const forwardedHost=requestHeaders.get('x-forwarded-host'),forwardedFor=requestHeaders.get('x-forwarded-for');
  if(forwardedHost&&forwardedHost!==host)return null;
  if(forwardedFor&&!forwardedFor.split(',').every(value=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(value.trim())))return null;
  return username;
}

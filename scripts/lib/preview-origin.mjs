// Quick Tunnel hostnames contain random words separated by hyphens.
// Service hosts such as api.trycloudflare.com and login.trycloudflare.com
// must never be presented as a playable game address.
export function isQuickTunnelOrigin(value) {
  return typeof value === 'string' && /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com$/.test(value);
}

export function findQuickTunnelOrigin(logs) {
  // cloudflared prints the assigned public URL inside its boxed banner.
  // Error messages may mention the provisioning API before or after it.
  const candidates = [...logs.matchAll(/\|\s*(https:\/\/[^\s|]+)\s*\|/g)];
  return candidates.map(match => match[1]).filter(isQuickTunnelOrigin).at(-1);
}

export function describeQuickTunnelFailure(logs) {
  if (/certificate signed by unknown authority|unable to verify the first certificate/i.test(logs)) {
    return '외부 연결의 TLS 인증서를 신뢰하지 못했습니다. 학교·회사 네트워크의 HTTPS 검사 인증서가 원인일 수 있습니다. 다른 네트워크에서 다시 시도하거나 전산 담당자가 제공하는 신뢰 인증서를 Docker에 설정해 주세요.';
  }
  return '게임 터널 주소를 발급받지 못했습니다. 인터넷 연결과 아래 터널 로그를 확인한 뒤 다시 시도해 주세요.';
}

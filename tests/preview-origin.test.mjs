import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findQuickTunnelOrigin, isQuickTunnelOrigin, describeQuickTunnelFailure} from '../scripts/lib/preview-origin.mjs';

test('API failure URLs never become a game address', () => {
  assert.equal(findQuickTunnelOrigin('ERR Request failed: Post "https://api.trycloudflare.com/tunnel": timeout'), undefined);
  assert.equal(findQuickTunnelOrigin('| https://api.trycloudflare.com |'), undefined);
  for (const value of ['https://api.trycloudflare.com', 'https://login.trycloudflare.com', 'https://word-word.trycloudflare.com.evil.test', 'https://word-word.trycloudflare.com/path']) {
    assert.equal(isQuickTunnelOrigin(value), false);
  }
});

test('selects the assigned banner URL despite later API errors', () => {
  const address = 'https://green-pocket-tower-game.trycloudflare.com';
  const logs = `tunnel-1 | INF | ${address} |\nERR Post "https://api.trycloudflare.com/tunnel": timeout`;
  assert.equal(findQuickTunnelOrigin(logs), address);
  assert.equal(isQuickTunnelOrigin(address), true);
});

test('only uses banner URLs and selects the latest assignment', () => {
  assert.equal(findQuickTunnelOrigin('old URL: https://old-game.trycloudflare.com'), undefined);
  assert.equal(findQuickTunnelOrigin('| https://old-game.trycloudflare.com |\n| https://new-game.trycloudflare.com |'), 'https://new-game.trycloudflare.com');
  assert.equal(findQuickTunnelOrigin(''), undefined);
});

test('certificate failures explain the network trust problem', () => {
  const logs='failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel": tls: failed to verify certificate: x509: certificate signed by unknown authority';
  assert.match(describeQuickTunnelFailure(logs), /TLS 인증서/);
  assert.match(describeQuickTunnelFailure(logs), /다른 네트워크/);
  assert.equal(findQuickTunnelOrigin(logs), undefined);
});

test('other tunnel failures keep the general network guidance', () => {
  assert.match(describeQuickTunnelFailure('connection timeout'), /인터넷 연결/);
});

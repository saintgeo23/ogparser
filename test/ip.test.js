import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateAddress } from '../src/ip.js';

test('detects non-public addresses', () => {
  for (const address of [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '::1', '::', 'fe80::1', 'fd00::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '[::1]',
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
});

test('allows public addresses', () => {
  for (const address of ['8.8.8.8', '93.184.215.14', '2606:4700::1111', '::ffff:8.8.8.8']) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});

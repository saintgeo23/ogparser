import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream';
import { OGParserError } from './errors.js';
import { isPrivateAddress } from './ip.js';

const DEFAULTS = {
  timeout: 10_000,
  maxBytes: 1024 * 1024,
  maxRedirects: 5,
  allowPrivateNetwork: false,
  headers: {},
};

const DEFAULT_HEADERS = {
  'user-agent': 'ogparser/2 (+https://github.com/saintgeo23/ogparser)',
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
  'accept-encoding': 'gzip, br',
};

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * @param {string | URL} input
 * @returns {URL}
 */
function toUrl(input) {
  let url;

  try {
    url = new URL(input);
  } catch (error) {
    throw new OGParserError(`Invalid URL: ${input}`, 'ERR_INVALID_URL', { cause: error });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OGParserError(`Unsupported protocol: ${url.protocol}`, 'ERR_INVALID_URL');
  }

  return url;
}

/**
 * dns.lookup replacement that refuses to connect to private addresses.
 * Runs on the actual connection, so DNS rebinding can't sneak past it.
 */
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);

    const blocked = addresses.find(({ address }) => isPrivateAddress(address));

    if (blocked) {
      return callback(new OGParserError(
        `Host ${hostname} resolves to non-public address ${blocked.address}`,
        'ERR_BLOCKED_HOST',
      ));
    }

    if (options.all) return callback(null, addresses);

    return callback(null, addresses[0].address, addresses[0].family);
  });
}

function assertPublicHost(url) {
  const host = url.hostname.replace(/^\[|\]$/g, '');

  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new OGParserError(`Host ${host} is not a public address`, 'ERR_BLOCKED_HOST');
  }
}

/**
 * @returns {Promise<http.IncomingMessage>}
 */
function request(url, options, signal) {
  const transport = url.protocol === 'https:' ? https : http;
  const headers = { ...DEFAULT_HEADERS };

  for (const [name, value] of Object.entries(options.headers)) {
    headers[name.toLowerCase()] = value;
  }

  return new Promise((resolve, reject) => {
    const req = transport.get(url, {
      headers,
      signal,
      // No connection pooling: a socket opened with allowPrivateNetwork must never be reused
      agent: false,
      lookup: options.allowPrivateNetwork ? undefined : safeLookup,
    }, resolve);

    req.on('error', reject);
  });
}

function decompress(res) {
  const encoding = (res.headers['content-encoding'] ?? '').trim().toLowerCase();
  const noop = () => {};

  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return pipeline(res, zlib.createGunzip(), noop);
    case 'br':
      return pipeline(res, zlib.createBrotliDecompress(), noop);
    default:
      return res;
  }
}

/**
 * Reads at most maxBytes of decompressed body. Open Graph tags live in <head>,
 * so the tail of a huge page is simply dropped instead of failing.
 */
async function readBody(res, maxBytes) {
  const chunks = [];
  let size = 0;

  try {
    for await (const chunk of decompress(res)) {
      chunks.push(chunk);
      size += chunk.length;

      if (size >= maxBytes) break;
    }
  } finally {
    res.destroy();
  }

  return Buffer.concat(chunks).subarray(0, maxBytes);
}

/**
 * @param {string | URL} input
 * @param {import('../index').FetchOptions} [options]
 * @returns {Promise<{ url: string, contentType: string, body: Buffer }>}
 */
export async function fetchPage(input, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const signals = [AbortSignal.timeout(opts.timeout)];

  if (opts.signal) signals.push(opts.signal);

  const signal = AbortSignal.any(signals);
  let url = toUrl(input);

  try {
    for (let redirects = 0; ; redirects += 1) {
      if (!opts.allowPrivateNetwork) assertPublicHost(url);

      const res = await request(url, opts, signal);
      const { statusCode = 0, headers } = res;

      if (REDIRECT_CODES.has(statusCode) && headers.location) {
        res.destroy();

        if (redirects >= opts.maxRedirects) {
          throw new OGParserError(`Too many redirects (max ${opts.maxRedirects})`, 'ERR_TOO_MANY_REDIRECTS');
        }

        url = toUrl(new URL(headers.location, url));
        continue;
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.destroy();
        throw new OGParserError(`Request failed with status ${statusCode}`, 'ERR_HTTP_STATUS');
      }

      const contentType = headers['content-type'] ?? '';

      if (contentType && !/html|xml/i.test(contentType)) {
        res.destroy();
        throw new OGParserError(`Not an HTML page: ${contentType}`, 'ERR_NOT_HTML');
      }

      return { url: url.href, contentType, body: await readBody(res, opts.maxBytes) };
    }
  } catch (error) {
    if (signal.aborted && signal.reason?.name === 'TimeoutError') {
      throw new OGParserError(`Request timed out after ${opts.timeout} ms`, 'ERR_TIMEOUT', { cause: error });
    }

    throw error;
  }
}

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { parse, OGParserError } from '../src/index.js';

const HTML = '<html><head><meta property="og:title" content="Test page"><meta property="og:image" content="/a.jpg"></head></html>';

const routes = {
  '/': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(HTML);
  },
  '/gzip': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' });
    res.end(zlib.gzipSync(HTML));
  },
  '/br': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'br' });
    res.end(zlib.brotliCompressSync(HTML));
  },
  '/cp1251': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=windows-1251' });
    res.end(Buffer.concat([
      Buffer.from('<meta property="og:title" content="'),
      Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]),
      Buffer.from('">'),
    ]));
  },
  '/redirect': (req, res) => {
    res.writeHead(302, { location: '/' });
    res.end();
  },
  '/loop': (req, res) => {
    res.writeHead(302, { location: '/loop' });
    res.end();
  },
  '/huge': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write(HTML);
    res.end('x'.repeat(5 * 1024 * 1024));
  },
  '/slow': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<html>');
  },
  '/json': (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  },
  '/404': (req, res) => {
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(HTML);
  },
  '/headers': (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<meta property="og:title" content="${req.headers['user-agent']}">`);
  },
};

let server;
let base;

before(async () => {
  server = http.createServer((req, res) => routes[req.url](req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

const local = { allowPrivateNetwork: true };

async function assertCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof OGParserError, error.message);
    assert.equal(error.code, code);
    return true;
  });
}

test('parses a page and resolves relative urls against it', async () => {
  const og = await parse(`${base}/`, local);

  assert.deepEqual(og, { title: 'Test page', image: [{ url: `${base}/a.jpg` }] });
});

test('decompresses gzip and brotli', async () => {
  assert.equal((await parse(`${base}/gzip`, local)).title, 'Test page');
  assert.equal((await parse(`${base}/br`, local)).title, 'Test page');
});

test('decodes charset from Content-Type', async () => {
  assert.equal((await parse(`${base}/cp1251`, local)).title, 'Привет');
});

test('follows redirects and resolves against the final url', async () => {
  const og = await parse(`${base}/redirect`, local);

  assert.equal(og.image[0].url, `${base}/a.jpg`);
});

test('stops on redirect loops', async () => {
  await assertCode(parse(`${base}/loop`, local), 'ERR_TOO_MANY_REDIRECTS');
});

test('reads no more than maxBytes', async () => {
  const og = await parse(`${base}/huge`, { ...local, maxBytes: 64 * 1024 });

  assert.equal(og.title, 'Test page');
});

test('times out on slow responses', async () => {
  await assertCode(parse(`${base}/slow`, { ...local, timeout: 200 }), 'ERR_TIMEOUT');
});

test('supports AbortSignal', async () => {
  await assert.rejects(parse(`${base}/slow`, { ...local, signal: AbortSignal.abort() }), { name: 'AbortError' });
});

test('rejects non-html and error responses', async () => {
  await assertCode(parse(`${base}/json`, local), 'ERR_NOT_HTML');
  await assertCode(parse(`${base}/404`, local), 'ERR_HTTP_STATUS');
});

test('sends custom headers', async () => {
  const og = await parse(`${base}/headers`, { ...local, headers: { 'User-Agent': 'my-bot' } });

  assert.equal(og.title, 'my-bot');
});

test('rejects invalid urls and protocols', async () => {
  await assertCode(parse('not a url'), 'ERR_INVALID_URL');
  await assertCode(parse('file:///etc/passwd'), 'ERR_INVALID_URL');
});

test('blocks private network by default', async () => {
  await assertCode(parse(`${base}/`), 'ERR_BLOCKED_HOST');
  await assertCode(parse('http://[::1]/'), 'ERR_BLOCKED_HOST');
  await assertCode(parse('http://169.254.169.254/latest/meta-data/'), 'ERR_BLOCKED_HOST');
  await assertCode(parse(`http://localhost:${new URL(base).port}/`), 'ERR_BLOCKED_HOST');
});

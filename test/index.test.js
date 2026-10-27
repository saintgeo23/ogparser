const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const OGParser = require('../index');

const page = (meta) => `<!doctype html><html><head>${meta}</head><body></body></html>`;

test('keeps 1.0 output format', () => {
  const og = OGParser.getData(page(`
    <meta property="og:site_name" content="Example">
    <meta property="og:type" content="article">
    <meta property="og:image" content="https://example.com/images/kittens.jpg">
    <meta property="og:image:width" content="480">
    <meta property="og:image:height" content="320">
    <meta property="og:title" content="Funny kittens">
    <meta property="og:locale" content="ru_RU">
  `));

  assert.deepEqual(og, {
    site_name: 'Example',
    type: 'article',
    image: { image: 'https://example.com/images/kittens.jpg', width: '480', height: '320' },
    title: 'Funny kittens',
    locale: 'ru_RU',
  });
});

test('keeps single og:image as a string', () => {
  const og = OGParser.getData(page('<meta property="og:image" content="https://example.com/a.jpg">'));

  assert.equal(og.image, 'https://example.com/a.jpg');
});

test('keeps structured properties declared before the value', () => {
  const og = OGParser.getData(page(`
    <meta property="og:image:width" content="480">
    <meta property="og:image" content="https://example.com/a.jpg">
  `));

  assert.deepEqual(og.image, { width: '480', image: 'https://example.com/a.jpg' });
});

test('does not throw on multiple images and keeps the first one', () => {
  const og = OGParser.getData(page(`
    <meta property="og:image" content="https://example.com/a.jpg">
    <meta property="og:image:width" content="480">
    <meta property="og:image" content="https://example.com/b.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image" content="https://example.com/c.jpg">
  `));

  assert.deepEqual(og.image, { image: 'https://example.com/a.jpg', width: '480' });
});

test('repeated structured property overwrites the previous one, as in 1.0', () => {
  const og = OGParser.getData(page(`
    <meta property="og:video" content="https://example.com/v.mp4">
    <meta property="og:video:tag" content="first">
    <meta property="og:video:tag" content="last">
  `));

  assert.deepEqual(og.video, { video: 'https://example.com/v.mp4', tag: 'last' });
});

test('does not throw on repeated plain properties', () => {
  const og = OGParser.getData(page(`
    <meta property="og:image" content="https://example.com/a.jpg">
    <meta property="og:image" content="https://example.com/b.jpg">
    <meta property="og:title" content="First">
    <meta property="og:title" content="Second">
  `));

  assert.deepEqual(og, { image: 'https://example.com/a.jpg', title: 'First' });
});

test('does not pollute Object.prototype', () => {
  const og = OGParser.getData(page(`
    <meta property="og:__proto__:polluted" content="yes">
    <meta property="og:constructor:prototype" content="yes">
    <meta property="og:image:__proto__" content="yes">
  `));

  assert.equal(({}).polluted, undefined);
  assert.deepEqual(og, {});
});

let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/cp1251') {
      res.writeHead(200, { 'content-type': 'text/html; charset=windows-1251' });
      res.end(Buffer.concat([
        Buffer.from('<meta property="og:title" content="'),
        Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]),
        Buffer.from('">'),
      ]));
    } else if (req.url === '/huge') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.write(page('<meta property="og:title" content="Huge">'));
      res.end('x'.repeat(5 * 1024 * 1024));
    } else if (req.url === '/404') {
      res.writeHead(404);
      res.end();
    } else {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(page(`<meta property="og:title" content="${req.headers['user-agent']}">`));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('parse returns a bluebird promise', async () => {
  const promise = OGParser.parse(`${base}/`);

  assert.equal(typeof promise.spread, 'function');
  assert.equal(typeof (await promise).title, 'string');
});

test('accepts request-style options object', async () => {
  const og = await OGParser.parse({ uri: `${base}/`, headers: { 'User-Agent': 'my-bot' } });

  assert.equal(og.title, 'my-bot');
});

test('decodes charset from Content-Type', async () => {
  assert.equal((await OGParser.parse(`${base}/cp1251`)).title, 'Привет');
});

test('reads no more than 1 MiB', async () => {
  assert.equal((await OGParser.parse(`${base}/huge`)).title, 'Huge');
});

test('rejects non-2xx responses with statusCode', async () => {
  await assert.rejects(OGParser.parse(`${base}/404`), { name: 'StatusCodeError', statusCode: 404 });
});

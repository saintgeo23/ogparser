import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml } from '../src/index.js';

const page = (meta) => `<!doctype html><html><head>${meta}</head><body></body></html>`;

test('extracts basic properties', () => {
  const og = parseHtml(page(`
    <meta property="og:title" content="Funny kittens">
    <meta property="og:type" content="article">
    <meta property="og:description" content="Watch this &amp; smile">
  `));

  assert.deepEqual(og, { title: 'Funny kittens', type: 'article', description: 'Watch this & smile' });
});

test('collects multiple images with structured properties', () => {
  const og = parseHtml(page(`
    <meta property="og:image" content="https://example.com/a.jpg">
    <meta property="og:image:width" content="480">
    <meta property="og:image:height" content="320">
    <meta property="og:image:alt" content="Kitten">
    <meta property="og:image" content="https://example.com/b.jpg">
    <meta property="og:image:secure_url" content="https://example.com/b.jpg">
    <meta property="og:image:type" content="image/jpeg">
  `));

  assert.deepEqual(og.image, [
    { url: 'https://example.com/a.jpg', width: 480, height: 320, alt: 'Kitten' },
    { url: 'https://example.com/b.jpg', secure_url: 'https://example.com/b.jpg', type: 'image/jpeg' },
  ]);
});

test('does not duplicate og:image followed by the same og:image:url', () => {
  const og = parseHtml(page(`
    <meta property="og:image" content="https://example.com/a.jpg">
    <meta property="og:image:url" content="https://example.com/a.jpg">
  `));

  assert.deepEqual(og.image, [{ url: 'https://example.com/a.jpg' }]);
});

test('attaches structured properties declared before the url', () => {
  const og = parseHtml(page(`
    <meta property="og:video:width" content="640">
    <meta property="og:video" content="https://example.com/v.mp4">
  `));

  assert.deepEqual(og.video, [{ width: 640, url: 'https://example.com/v.mp4' }]);
});

test('keeps the first value of a repeated scalar property', () => {
  const og = parseHtml(page(`
    <meta property="og:title" content="First">
    <meta property="og:title" content="Second">
  `));

  assert.equal(og.title, 'First');
});

test('collects og:locale:alternate into an array', () => {
  const og = parseHtml(page(`
    <meta property="og:locale" content="ru_RU">
    <meta property="og:locale:alternate" content="en_US">
    <meta property="og:locale:alternate" content="de_DE">
  `));

  assert.deepEqual(og, { locale: 'ru_RU', locale_alternate: ['en_US', 'de_DE'] });
});

test('supports name attribute and mixed case', () => {
  const og = parseHtml(page('<META NAME="OG:Title" CONTENT="Hello">'));

  assert.equal(og.title, 'Hello');
});

test('resolves relative urls against baseUrl', () => {
  const og = parseHtml(page(`
    <meta property="og:url" content="/articles/1">
    <meta property="og:image" content="../img/a.jpg">
  `), { baseUrl: 'https://example.com/news/today' });

  assert.equal(og.url, 'https://example.com/articles/1');
  assert.equal(og.image[0].url, 'https://example.com/img/a.jpg');
});

test('ignores non-og, empty and malformed tags', () => {
  const og = parseHtml(page(`
    <meta property="twitter:title" content="Nope">
    <meta property="og:" content="Nope">
    <meta property="og:title" content="">
    <meta property="og:description">
    <meta charset="utf-8">
  `));

  assert.deepEqual(og, {});
});

test('does not pollute Object.prototype', () => {
  const og = parseHtml(page(`
    <meta property="og:__proto__:polluted" content="yes">
    <meta property="og:constructor:prototype" content="yes">
    <meta property="og:image:__proto__" content="yes">
    <meta property="og:__proto__" content="yes">
  `));

  assert.equal(({}).polluted, undefined);
  assert.equal(Object.getPrototypeOf(og), Object.prototype);
  assert.deepEqual(og, {});
});

test('decodes windows-1251 from bytes using meta charset', () => {
  const html = page('<meta charset="windows-1251"><meta property="og:title" content="Привет">');
  // "Привет" in windows-1251
  const bytes = Buffer.from(html.replace('Привет', '\0'), 'latin1');
  const index = bytes.indexOf(0);
  const encoded = Buffer.concat([
    bytes.subarray(0, index),
    Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]),
    bytes.subarray(index + 1),
  ]);

  assert.equal(parseHtml(encoded).title, 'Привет');
});

test('handles HTML without head and garbage input', () => {
  assert.deepEqual(parseHtml('<meta property="og:title" content="Bare">'), { title: 'Bare' });
  assert.deepEqual(parseHtml(''), {});
  assert.deepEqual(parseHtml('<<<>>> not html'), {});
});

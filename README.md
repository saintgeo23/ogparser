# ogparser

[![npm](https://img.shields.io/npm/v/ogparser)](https://www.npmjs.com/package/ogparser)
[![test](https://github.com/saintgeo23/ogparser/actions/workflows/test.yml/badge.svg)](https://github.com/saintgeo23/ogparser/actions/workflows/test.yml)

Safe and fast [Open Graph](https://ogp.me/) meta tags parser for Node.js.

- **One dependency** — [htmlparser2](https://github.com/fb55/htmlparser2), no `request`, no `cheerio`
- **SSRF protection** — refuses localhost, private networks and cloud metadata endpoints, including via DNS and redirects
- **Bounded** — timeout, redirect limit and body size limit out of the box
- **Correct** — multiple images/videos/audio, structured properties, relative URLs, `windows-1251` and other legacy charsets, gzip and brotli
- **Typed** — TypeScript declarations included

## Installation

```bash
npm install ogparser
```

Requires Node.js 20.19 or newer.

## Usage

```javascript
import { parse } from 'ogparser';

const og = await parse('https://example.com/articles/funny-kittens');
```

```javascript
{
  site_name: 'Example',
  type: 'article',
  title: 'Funny kittens',
  description: 'Watch these funniest kittens!',
  url: 'https://example.com/articles/funny-kittens',
  image: [
    { url: 'https://example.com/images/kittens.jpg', width: 480, height: 320, alt: 'Kittens' },
    { url: 'https://example.com/images/more-kittens.jpg' }
  ]
}
```

Already have the HTML? Skip the network:

```javascript
import { parseHtml } from 'ogparser';

const og = parseHtml(html, { baseUrl: 'https://example.com/articles/funny-kittens' });
```

`parseHtml` accepts a string or raw bytes (`Buffer`/`Uint8Array`). Bytes are decoded using the BOM or `<meta charset>`.

CommonJS works too on Node.js 20.19+ / 22.12+:

```javascript
const { parse } = require('ogparser');
```

## Options

```javascript
await parse(url, {
  timeout: 10_000, // ms, for the whole request including redirects
  maxBytes: 1024 * 1024, // decompressed body limit, the rest of the page is ignored
  maxRedirects: 5,
  allowPrivateNetwork: false, // set true to parse localhost or intranet pages
  headers: { 'User-Agent': 'MyBot/1.0' },
  signal: abortController.signal,
});
```

## Output format

- `image`, `video`, `audio` are always arrays of objects. Structured properties (`og:image:width`, `og:image:alt`, ...) are attached to the preceding item. `width` and `height` are numbers.
- `og:url`, `og:image`, `og:image:secure_url` etc. are resolved to absolute URLs against the final page URL.
- `og:locale:alternate` is collected into the `locale_alternate` array.
- Other properties are strings; if a property is repeated, the first value wins. Nested names are joined with `_`.
- Both `<meta property="og:...">` and `<meta name="og:...">` are supported.

## Errors

Network and validation errors are thrown as `OGParserError` with a `code`:

| Code | When |
| --- | --- |
| `ERR_INVALID_URL` | malformed URL or protocol other than `http:`/`https:` |
| `ERR_BLOCKED_HOST` | host is or resolves to a non-public address |
| `ERR_TIMEOUT` | `timeout` exceeded |
| `ERR_TOO_MANY_REDIRECTS` | `maxRedirects` exceeded |
| `ERR_HTTP_STATUS` | response status is not 2xx |
| `ERR_NOT_HTML` | response `Content-Type` is not HTML |

```javascript
import { parse, OGParserError } from 'ogparser';

try {
  await parse(userUrl);
} catch (error) {
  if (error instanceof OGParserError && error.code === 'ERR_BLOCKED_HOST') {
    // someone tried to reach your internal network
  }
}
```

## Migrating from 1.x

- ESM package, Node.js 20.19+.
- `image`, `video`, `audio` are now arrays: `og.image.image` → `og.image[0].url`.
- `width`/`height` are numbers.
- Private network addresses are blocked by default, pass `allowPrivateNetwork: true` if you need them.

See [CHANGELOG](CHANGELOG.md) for details.

## License

[ISC](LICENSE.md)

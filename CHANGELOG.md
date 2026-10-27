# Changelog

## 2.0.0

Full rewrite.

### Security
- Fixed prototype pollution: a page with `<meta property="og:__proto__:x">` could modify `Object.prototype` of the whole process.
- Added SSRF protection: requests to localhost, private, link-local and other non-public addresses are blocked by default, checked on every redirect and on the actual DNS resolution.
- Added request timeout, redirect limit and response size limit (applies to decompressed data, so gzip bombs are covered too).
- Removed deprecated `request`/`request-promise` and their vulnerable dependency tree. `cheerio` and `bluebird` replaced with a single dependency, `htmlparser2`.

### Fixed
- Pages with more than one `og:image` (or `og:video`, `og:audio`) no longer throw `TypeError`.
- Structured properties are attached to the right media item.
- Legacy charsets such as `windows-1251` are decoded correctly.

### Added
- `parseHtml(html, { baseUrl })` to parse already downloaded HTML.
- Options: `timeout`, `maxBytes`, `maxRedirects`, `allowPrivateNetwork`, `headers`, `signal`.
- `OGParserError` with machine-readable `code`.
- Relative URLs are resolved to absolute.
- `<meta name="og:...">` support.
- gzip and brotli support.
- TypeScript declarations.

### Breaking
- ESM package, Node.js 20.19+ required. `require()` still works on Node.js versions with `require(esm)` support.
- `image`, `video`, `audio` are arrays of objects: `og.image.image` → `og.image[0].url`.
- `width` and `height` are numbers.
- Nested non-media properties are joined with `_` (`og:locale:alternate` → `locale_alternate`).
- Repeated scalar properties keep the first value.

## 1.1.0

Security release for 1.x, output format is unchanged. Maintained in the [`1.x`](https://github.com/saintgeo23/ogparser/tree/1.x) branch.

- Fixed prototype pollution.
- Fixed `TypeError` on pages with repeated `og:image` and other tags.
- Replaced deprecated `request` with built-in `fetch`, `cheerio` with `htmlparser2`.
- Added timeout and response size limit, charset support.

## 1.0.0

Initial release.

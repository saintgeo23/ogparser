# Changelog

## 1.1.0

Security release, output format is unchanged.

### Security
- Fixed prototype pollution: a page with `<meta property="og:__proto__:x">` could modify `Object.prototype` of the whole process.
- Removed deprecated `request`/`request-promise` and their vulnerable dependency tree, the built-in `fetch` is used instead. `cheerio` replaced with `htmlparser2`.
- Added 10 second timeout and 1 MiB response size limit.

### Fixed
- Pages with more than one `og:image` (or any other repeated tag) no longer throw `TypeError`. The first value is returned.
- Charset from `Content-Type` or `<meta charset>` is respected, so `windows-1251` and other legacy encodings are decoded correctly.

### Changed
- Node.js 18 or newer is required.
- Non-2xx responses are rejected with an `Error` named `StatusCodeError` with `statusCode`, as before, but it is no longer a `request-promise` error instance.

## 1.0.0

Initial release.

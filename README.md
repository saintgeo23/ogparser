# ogparser
Node.js module for parsing Open Graph meta-tags from URL

> **1.x is in maintenance mode.** It only receives security fixes. Use [2.x](https://github.com/saintgeo23/ogparser) for multiple images, relative URL resolution and SSRF protection.

## Requirements
Node.js 18 or newer.

## Dependencies
- bluebird
- htmlparser2

## Installation
```bash
npm install ogparser
```

## Usage
```javascript
const OGParser = require('ogparser');

async function getOG(url) {
  return await OGParser.parse(url);
}
```

## Ouput
```javascript
{
  site_name: 'Example',
  type: 'article',
  image: {
    image: 'https://example.com/images/kittens.jpg',
    width: '480',
    height: '320'
  },
  title: 'Funny kittens',
  description: 'Watch this funniest kittens!',
  url: 'https://example.com/articles/funny_kittens'
}
```

If a page has several `og:image` (or other repeated tags), the first one is returned.

Requests time out after 10 seconds, at most 1 MiB of a page is read.

## Security
`parse(url)` requests any URL it is given, including `localhost` and private networks. Do not pass user-provided URLs to it on a server, or upgrade to 2.x, which blocks such requests.

## Links
[The Open Graph protocol](http://ogp.me/ "The Open Graph protocol documentation") documentation.

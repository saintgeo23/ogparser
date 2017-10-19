# ogparser
Node.js module for parsing Open Graph meta-tags from URL

## Dependencies
- bluebird
- cheerio
- request-promise

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

## Links
[The Open Graph protocol](http://ogp.me/ "The Open Graph protocol documentation") documentation.

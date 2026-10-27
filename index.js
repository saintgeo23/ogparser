const { Parser } = require('htmlparser2');
const Promise = require('bluebird');

const TIMEOUT = 10000;
const MAX_BYTES = 1024 * 1024;
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function getCharset(contentType, buffer) {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType || '');

  if (fromHeader) {
    return fromHeader[1];
  }

  const head = buffer.subarray(0, 4096).toString('latin1');
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);

  return fromMeta ? fromMeta[1] : 'utf-8';
}

function decode(buffer, contentType) {
  try {
    return new TextDecoder(getCharset(contentType, buffer)).decode(buffer);
  } catch (error) {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

async function readBody(response) {
  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;

  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    size += value.length;
  }

  await reader.cancel();

  return Buffer.concat(chunks).subarray(0, MAX_BYTES);
}

class OpenGraphParser {
  constructor() { }

  async getResource(options) {
    const url = typeof options === 'object' && !(options instanceof URL)
      ? options.uri || options.url
      : options;
    const headers = typeof options === 'object' && options.headers ? options.headers : {};

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!response.ok) {
      await response.body?.cancel();

      const error = new Error(`Request failed with status ${response.status}`);
      error.name = 'StatusCodeError';
      error.statusCode = response.status;

      throw error;
    }

    return decode(await readBody(response), response.headers.get('content-type'));
  }

  getMetaTags(data) {
    const tags = [];
    const parser = new Parser({
      onopentag(name, attribs) {
        if (name === 'meta' && attribs.property !== undefined && attribs.content !== undefined) {
          tags.push([attribs.property, attribs.content]);
        }
      },
    }, { decodeEntities: true });

    parser.end(String(data));

    return tags;
  }

  getData(data) {
    const og = {};
    // Keys that already got a second value, e.g. the second og:image.
    // The first one is kept, the rest are ignored.
    const completed = new Set();

    for (const [property, content] of this.getMetaTags(data)) {
      const [namespace, key, subKey] = property.split(':');

      if (namespace !== 'og' || !key || completed.has(key)) {
        continue;
      }

      if (FORBIDDEN_KEYS.includes(key) || FORBIDDEN_KEYS.includes(subKey)) {
        continue;
      }

      if (subKey === undefined) {
        if (!hasOwn(og, key)) {
          og[key] = content;
        } else if (typeof og[key] === 'object' && !hasOwn(og[key], key)) {
          og[key][key] = content;
        } else {
          completed.add(key);
        }
      } else if (!hasOwn(og, key)) {
        og[key] = { [subKey]: content };
      } else if (typeof og[key] === 'string') {
        og[key] = { [key]: og[key], [subKey]: content };
      } else {
        og[key][subKey] = content;
      }
    }

    return og;
  }

  parse(url) {
    return Promise.resolve(this.getResource(url)).then((data) => this.getData(data));
  }
}

module.exports = new OpenGraphParser;

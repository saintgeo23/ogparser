import { Parser } from 'htmlparser2';

const MEDIA = new Set(['image', 'video', 'audio']);
const ARRAYS = new Set(['locale_alternate']);
const URL_PROPS = new Set(['url', 'secure_url']);
const NUMERIC_PROPS = new Set(['width', 'height']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * @param {string} html
 * @returns {Array<[property: string, content: string]>}
 */
function collectMetaTags(html) {
  const tags = [];
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name !== 'meta' || attrs.content === undefined) return;

      const property = (attrs.property ?? attrs.name)?.trim().toLowerCase();

      if (property) tags.push([property, attrs.content.trim()]);
    },
  }, { decodeEntities: true, lowerCaseAttributeNames: true });

  parser.end(html);

  return tags;
}

function resolveUrl(value, baseUrl) {
  if (!baseUrl) return value;

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function normalizeValue(prop, value, baseUrl) {
  if (URL_PROPS.has(prop)) return resolveUrl(value, baseUrl);

  if (NUMERIC_PROPS.has(prop)) {
    const number = Number(value);

    return Number.isFinite(number) ? number : value;
  }

  return value;
}

/**
 * og:image, og:image:url — start a new item; og:image:width etc. describe the last one.
 */
function addMedia(list, prop, value) {
  const last = list.at(-1);

  if (prop === 'url') {
    if (last && last.url === undefined) last.url = value;
    else if (!last || last.url !== value) list.push({ url: value });

    return;
  }

  if (!last) list.push({ [prop]: value });
  else if (!Object.hasOwn(last, prop)) last[prop] = value;
}

/**
 * @param {string} html
 * @param {string} [baseUrl] used to resolve relative og:url, og:image, etc.
 * @returns {import('../index').OpenGraph}
 */
export function extract(html, baseUrl) {
  const og = {};

  for (const [property, content] of collectMetaTags(html)) {
    const [namespace, name, ...rest] = property.split(':');

    if (namespace !== 'og' || !name || !content) continue;
    if ([name, ...rest].some((part) => FORBIDDEN_KEYS.has(part))) continue;

    if (MEDIA.has(name)) {
      const prop = rest.length ? rest.join('_') : 'url';

      og[name] ??= [];
      addMedia(og[name], prop, normalizeValue(prop, content, baseUrl));
      continue;
    }

    const key = [name, ...rest].join('_');
    const value = normalizeValue(key, content, baseUrl);

    if (ARRAYS.has(key)) {
      og[key] ??= [];
      og[key].push(value);
    } else if (!Object.hasOwn(og, key)) {
      og[key] = value;
    }
  }

  return og;
}

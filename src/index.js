import { fetchPage } from './fetch.js';
import { decodeHtml } from './charset.js';
import { extract } from './extract.js';

export { OGParserError } from './errors.js';

/**
 * Downloads a page and extracts its Open Graph tags.
 * @param {string | URL} url
 * @param {import('../index').FetchOptions} [options]
 * @returns {Promise<import('../index').OpenGraph>}
 */
export async function parse(url, options) {
  const page = await fetchPage(url, options);

  return extract(decodeHtml(page.body, page.contentType), page.url);
}

/**
 * Extracts Open Graph tags from already downloaded HTML.
 * @param {string | Uint8Array} html
 * @param {import('../index').ParseHtmlOptions} [options]
 * @returns {import('../index').OpenGraph}
 */
export function parseHtml(html, { baseUrl } = {}) {
  return extract(typeof html === 'string' ? html : decodeHtml(html), baseUrl);
}

export default { parse, parseHtml };

export interface OpenGraphMedia {
  url?: string;
  secure_url?: string;
  type?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
  [property: string]: string | number | undefined;
}

export interface OpenGraph {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  site_name?: string;
  determiner?: string;
  locale?: string;
  locale_alternate?: string[];
  image?: OpenGraphMedia[];
  video?: OpenGraphMedia[];
  audio?: OpenGraphMedia[];
  [property: string]: string | string[] | OpenGraphMedia[] | undefined;
}

export interface FetchOptions {
  /** Request timeout including redirects and body, ms. Default: 10000 */
  timeout?: number;
  /** Max decompressed body size to read, bytes. The rest is ignored. Default: 1 MiB */
  maxBytes?: number;
  /** Default: 5 */
  maxRedirects?: number;
  /** Allow localhost, private and link-local addresses. Default: false */
  allowPrivateNetwork?: boolean;
  /** Extra request headers, e.g. a custom User-Agent */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ParseHtmlOptions {
  /** Page url to resolve relative og:url, og:image, etc. */
  baseUrl?: string | URL;
}

export type OGParserErrorCode =
  | 'ERR_INVALID_URL'
  | 'ERR_BLOCKED_HOST'
  | 'ERR_TIMEOUT'
  | 'ERR_TOO_MANY_REDIRECTS'
  | 'ERR_HTTP_STATUS'
  | 'ERR_NOT_HTML';

export class OGParserError extends Error {
  name: 'OGParserError';
  code: OGParserErrorCode;
}

export function parse(url: string | URL, options?: FetchOptions): Promise<OpenGraph>;
export function parseHtml(html: string | Uint8Array, options?: ParseHtmlOptions): OpenGraph;

declare const ogparser: {
  parse: typeof parse;
  parseHtml: typeof parseHtml;
};

export default ogparser;

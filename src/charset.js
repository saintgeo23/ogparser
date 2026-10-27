const UTF8_BOM = [0xef, 0xbb, 0xbf];

function fromContentType(contentType) {
  return /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
}

function fromMetaTag(buffer) {
  const head = buffer.subarray(0, 4096).toString('latin1');

  return /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
}

function hasUtf8Bom(buffer) {
  return UTF8_BOM.every((byte, index) => buffer[index] === byte);
}

/**
 * Decodes HTML bytes using BOM, then Content-Type header, then <meta charset>, then UTF-8.
 * @param {Uint8Array} buffer
 * @param {string} [contentType]
 * @returns {string}
 */
export function decodeHtml(buffer, contentType = '') {
  const bytes = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const charset = hasUtf8Bom(bytes)
    ? 'utf-8'
    : fromContentType(contentType) ?? fromMetaTag(bytes) ?? 'utf-8';

  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

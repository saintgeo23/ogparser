export class OGParserError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {ErrorOptions} [options]
   */
  constructor(message, code, options) {
    super(message, options);
    this.name = 'OGParserError';
    this.code = code;
  }
}

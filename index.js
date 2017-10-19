const request = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('bluebird');

class OpenGraphParser {
  constructor() { }

  async getResource(url) {
    return await request.get(url);
  }

  getData(data) {
    const $ = cheerio.load(data);
    const meta = $('meta');
    const og = {};

    if (meta === undefined || meta.length === 0) {
      return og;
    }

    for (let index = 0; index < meta.length; index += 1) {
      const elem = meta[index];
      const attribs = elem.attribs;
      const property = attribs.property;

      if (property === undefined) {
        continue;
      }

      const content = attribs.content;
      const propertyArray = property.split(':');

      if (propertyArray[0] !== 'og') {
        continue;
      }

      const length = propertyArray.length;

      if (propertyArray.length < 2) {
        continue;
      }

      const key = propertyArray[1];
      const subKey = propertyArray[2];

      if (subKey === undefined) {
        if (og[key] === undefined) {
          og[key] = content;
        } else {
          og[key][key] = content;
        }
      } else {
        if (og[key] === undefined) {
          og[key] = {};
          og[key][subKey] = content;
        } else {
          if (typeof og[key] !== 'string') {
            og[key][subKey] = content;
          } else {
            const temporal = og[key];
            og[key] = {};
            og[key][key] = temporal;
            og[key][subKey] = content;
          }
        }
      }
    };

    return og;
  }

  parse(url) {
    return new Promise(async (resolve, reject) => {
      let data;

      try {
        data = await this.getResource(url);

        return resolve(this.getData(data));
      } catch (error) {
        return reject(error);
      }
    });
  }
}

module.exports = new OpenGraphParser;

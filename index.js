const request = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('bluebird');

class OpenGraphParser {
  constructor() {
    this.parse('https://ifunny.co/fun/RDB5IDrD5')
      .then((data) => {
        console.log(data);
      });
  }

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

      const key = propertyArray.length[1];
      const subKey = propertyArray.length[2];

      if (subKey !== undefined) {
        if (og.hasOwnProperty(key)) {
          if (!Array.isArray(og[key])) {
            og[key][subKey] = content;
          } else {
            const tmpLength = og[key].length;
            og[key][tmpLength - 1][subKey] = content;
          }
        }
      } else {
        if (!og.hasOwnProperty(key)) {
          og[key] = {}
          og[key][key] = content;
        } else {
          if (!Array.isArray(og[key])) {
            const current = og[key];
            og[key] = [current];
          }

          const tmpObj = {};
          tmpObj[key] = content;
          og[key].push(tmpObj);
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

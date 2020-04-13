const JWT = require('jsonwebtoken');
const needle = require('needle');
const urlJoin = require('url-join');
const debug = require('debug')('segbird');

class Segbird {
  /**
   * Initialize segbird
   * @param {Object} settings
   * @param {Object} settings.server - An instance of loopback server
   * @param {Object} settings.services - A list of microservices hosts
   * @param {String} settings.jwtSecret - The JWT secret to encrypt and decrypt requests
   * @param {Number} [settings.jwtTtl=10] - The JWT TTL in seconds for outgoing requests (optional)
   * @param {String} [settings.apiPrefix=segbird] - An api prefix to use for incoming and outgoing requests (optional)
   * @return {undefined}
   */
  init({
    services, server, jwtSecret, jwtTtl, apiPrefix,
  }) {
    debug('Initializing...');
    // Save server instance
    this._server = server;
    // Initialize list of services
    this._services = {};
    if (typeof services === 'object') {
      Object.keys(services).forEach((service) => {
        const host = services[service];
        if (typeof host !== 'string') {
          throw new Error(`Invalid service ${service}. Host must be a string.`);
        }
      });
      this._services = services;
    }
    // Initialize config
    this._config = {};
    if (typeof jwtSecret === 'string') {
      this._config.jwtSecret = jwtSecret;
    } else {
      throw new Error('settings.jwtSecret is empty. You must configure a secret.');
    }
    jwtTtl = typeof jwtTtl === 'string' ? parseInt(jwtTtl) : jwtTtl;
    this._config.jwtTtl = jwtTtl || 10;
    this._config.apiPrefix = apiPrefix || '/segbird';
    debug('Segbird is ready.');
  }

  async publish(event, service, data = {}) {
    if (!this._services[service]) {
      throw new Error(`The service "${service}" has not been configured.`);
    }
    const token = JWT.sign(data, this._config.jwtSecret, { expiresIn: this._config.jwtTtl });
    const endpoint = urlJoin(this._services[service], this._config.apiPrefix, event);
    const response = await needle('POST', endpoint, {}, { headers: { Authorization: token } })
      .catch((rawError) => {
        let error;
        if (rawError.code === 'ENOTFOUND' || rawError.code === 'ECONNREFUSED') {
          // The service could not be reached or is down
          error = new Error(`Service ${service} could not be reached or is down.`);
          error.status = 503;
        } else {
          error = rawError;
        }
        throw error;
      });
    if (response.statusCode !== 200) {
      throw new Error(`The service failed with error code ${response.statusCode}. Message: ${response.body}`);
    }
    return response.body;
  }

  subscribe(event, cb) {
    const path = urlJoin(this._config.apiPrefix, event);
    this._server.post(path, async (req, res) => {
      try {
        const { authorization } = req.headers;
        const data = JWT.verify(authorization, this._config.jwtSecret);
        const response = await cb(data);
        res.send(response);
      } catch (e) {
        res.status(500).send(e.message);
      }
    });
  }
}

const segbird = new Segbird();
module.exports = segbird;

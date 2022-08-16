const proc = require('process');
const prompt = require('prompt');
const crypto = require('crypto');
const { Config, DefaultKeys } = require('./config');
const { simpleRespone, validString, AppErrorMsg, } = require('./com');
const LOG = require('./log');

const kSalt = 'salt';
const kSaltEnv = 'SALT';

Config.registerModule(__filename, {
  loadEnv: _ => {
    const conf = {};
    if (validString(proc.env[kSaltEnv])) {
      conf[kSalt] = proc.env[kSaltEnv];
    }
    return conf;
  },
  install: async _ => {
    if (Config.configs[DefaultKeys.API_SIGN] == 'Y') {
      const schema = {
        properties: {
          salt: {
            type: 'string',
            description: '请输入签名混淆 Key',
            required: true,
            default: ''
          },
        }
      };
      const ret = await prompt.get(schema);
      Config.set(kSalt, ret.salt);
    }
  }
});

const calcSign = (params) => {
  const ks = [];
  for (const k in params) {
    ks.push(k);
  }
  ks.sort();

  const sha256 = crypto.createHash('sha256');
  ks.forEach(v => {
    sha256.update(params[v].toString());
  });
  if (!validString(Config.get(kSalt))) {
    throw `${kSalt} must be valid string`;
  }
  sha256.update(Config.get(kSalt));

  return sha256.digest('hex');
};

const verifySign = (req, res, next) => {
  if (Config.configs[DefaultKeys.API_SIGN] == 'Y') {
    const params = req.body;
    LOG.debug(req.path, 'body:', params);
    const sign = params['Sign'];
    delete params['Sign'];

    if (!validString(Config.get(kSalt))) {
      next();
      return;
    }
    const s = calcSign(params);
    LOG.debug(`req sign: ${sign}, calc sign: ${s}`);
    if (s != sign) {
      return simpleRespone(req, res, AppErrorMsg.InvalidSign);
    }
    next();
  } else {
    next();
  }

};

module.exports = {
  verifySign
};

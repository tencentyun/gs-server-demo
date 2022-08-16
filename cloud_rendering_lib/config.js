const fs = require("fs");
const prompt = require('prompt');

const CONF_KEYS = {
  SECRET_ID: 'secret_id',     // 腾讯云 SecretId
  SECRET_KEY: 'secret_key',   // 腾讯云 SecretKey
  API_SIGN: 'api_sign',       // 是否开启 sign 校验参数
  FILE_PATH: './config.json', // 配置文件名
};

class AppConfig {
  constructor() {
    this.modules = {};
    this.configs = {};
  }

  reloadConfig() {
    try {
      fs.accessSync(CONF_KEYS.FILE_PATH, fs.constants.R_OK);
    } catch (e) {
      fs.writeFileSync(CONF_KEYS.FILE_PATH, '{}');
    }
    const buf = fs.readFileSync(CONF_KEYS.FILE_PATH);
    this.configs = JSON.parse(buf) || {};
    for (const k in this.modules) {
      const m = this.modules[k];
      if (typeof (m.loadEnv) === 'function') {
        this.configs = { ...this.configs, ...m.loadEnv(this.configs) };
      }
    }
    this.save();
    console.info('load env configure:', this.configs);
  }

  get(key) {
    return this.configs[key];
  }

  set(key, val) {
    this.configs[key] = val;
    this.save();
  }

  save() {
    const confStr = JSON.stringify(this.configs, null, 2);
    fs.writeFileSync(CONF_KEYS.FILE_PATH, confStr);
  }

  registerModule(name, { loadEnv, install, router }) {
    this.modules[name] = { loadEnv, install, router };
  }

  async runInstall() {
    console.info('正在进行初始化配置······');
    prompt.start();
    prompt.message = '';
    for (const k in this.modules) {
      const m = this.modules[k];
      if (typeof (m.install) === 'function') {
        await m.install();
      }
    }
  }

  setupRouter(app, path) {
    for (const k in this.modules) {
      const m = this.modules[k];
      if (m.router) {
        app.use(path, m.router);
      }
    }
  }
};

const config = new AppConfig();

module.exports = {
  DefaultKeys: CONF_KEYS,
  Config: config
};

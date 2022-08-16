const process = require('process');

const { Config } = require('./cloud_rendering_lib/config');
require('./entry');

(async _ => {
  await Config.runInstall();
  process.exit(0);
})();

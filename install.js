require('./cloud_rendering_lib/com');
require('./cloud_rendering_lib/sign');
require('./cloud_rendering_lib/redis');

const process = require('process');
const { Config } = require('./cloud_rendering_lib/config');
Config.reloadConfig();

(async _ => {
  await Config.runInstall();
  process.exit(0);
})();

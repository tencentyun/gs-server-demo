const { Config } = require('./cloud_rendering_lib/config');
Config.reloadConfig();

require('./routes/gs');

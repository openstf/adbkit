const Path = require('path');

module.exports = (() => { switch (Path.extname(__filename)) {
  case '.coffee': return require('./src/adb');
  default: return require('./lib/adb');
} })();

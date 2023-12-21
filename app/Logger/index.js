const log4js = require('koa-log4');

const LOG_SIZE = 1024 * 1024 * 10;
const BACKUPS = 10;
log4js.configure({
  appenders: {
    console: {
      type: 'console',
      category: 'console'
    },
    access: {
      type: "dateFile",
      filename: './logs/access.log',
      pattern: "-yyyy-MM-dd",
      compress: true,
      alwaysIncludePattern: true,
      maxLogSize: LOG_SIZE,
      backups: BACKUPS
    },
    out: {
      type: "dateFile",
      filename: './logs/access.log',
      pattern: "-yyyy-MM-dd",
      compress: true,
      alwaysIncludePattern: true,
      maxLogSize: LOG_SIZE,
      backups: BACKUPS
    },
    info: {
      type: "dateFile",
      filename: './logs/info.log',
      pattern: "-yyyy-MM-dd",
      compress: true,
      alwaysIncludePattern: true,
      maxLogSize: LOG_SIZE,
      backups: BACKUPS
    },
    request: {
      type: "dateFile",
      filename: './logs/request.log',
      pattern: "-yyyy-MM-dd",
      compress: true,
      alwaysIncludePattern: true,
      maxLogSize: LOG_SIZE,
      backups: BACKUPS
    },
    error: {
      type: "dateFile",
      filename: './logs/error.log',
      pattern: "-yyyy-MM-dd",
      compress: true,
      alwaysIncludePattern: true,
      maxLogSize: LOG_SIZE,
      backups: BACKUPS
    }
  },
  categories: {
    default: {
      appenders: ['console', 'access', 'out'],
      level: 'ALL'
    },
    info: {
      appenders: ['info'],
      level: 'ALL'
    },
    request: {
      appenders: ['request'],
      level: 'ALL'
    },
    error: {
      appenders: ['error'],
      level: 'ERROR'
    }
  },
  replaceConsole: true,
  disableClustering: true,
  pm2: true,
  pm2InstanceVar: "isMaster", // 与pm2的instance_var对应
});
const infoLogger = log4js.getLogger('info');
const errorLogger = log4js.getLogger('error');
const consoleLogger = log4js.getLogger('console');
module.exports = {
  info: (...args) => infoLogger.info(...args),
  error: (...args) => errorLogger.error(...args),
  console: (...args) => consoleLogger.info(...args),
  debug: (...args) => consoleLogger.info(...args),
  trace: (...args) => consoleLogger.info(...args),
  log: (...args) => consoleLogger.info(...args),
}

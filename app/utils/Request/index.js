const { v4: UUID } = require('uuid');
const { stringifyUrl } = require('query-string');
const RequestBase = require('request');

const log4js = require('koa-log4');
const Logger = require('../../Logger');

const requestLogger = log4js.getLogger('request');

const DOMAIN_ENUM = {
  prod: 'http://prod.com',
}

const Request = async (options) => {
  // Logger.info("Request options: ", JSON.stringify(options));
  if (!options || !options.url) {
    return Promise.reject({
      status: -100,
      msg: `参数异常`
    });
  }

  let url = options.url;
  const method = (options.method || 'GET').toUpperCase();
  const params = options.data;
  const traceId = UUID();
  if (method === 'GET' && params) {
    url = stringifyUrl({
      url,
      query: {
        ...params,
        _t_: traceId
      }
    });
    delete options.data;
  } else if (method === 'POST' && params) {
    url = stringifyUrl({
      url,
      query: {
        _t_: traceId
      }
    });
    options.body = params;
    delete options.data;
  }

  const timeout = options.timeout || 1000 * 60;
  requestLogger.info(`start `, url, JSON.stringify(options), ` # ${traceId}`);

  return new Promise((resolve, reject) => {

    const startTime = Date.now();
    const timer = setTimeout(() => {
      const now = Date.now();
      const msg = `${url} 请求超时，共花费 ${now - startTime} 毫秒`;
      requestLogger.info(msg)
      resolve({
        status: -1,
        data: msg
      })
    }, timeout);
    
    try {
      RequestBase(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
        },
        method,
        json: true
      }, (error, response, body) => {
        try {
          if (timer) {
            clearTimeout(timer);
          }
          requestLogger.info(`end ${Date.now() - startTime} #`, JSON.stringify(body), error, `# ${traceId}`);
          if (error) {
            reject({
              status: -100,
              data: `请求异常，${error.message}`,
              error
            })
          }
          if(body && !body.hasOwnProperty('status') && body.hasOwnProperty('ret')) {
            body.status = body.ret
          }

          if (!body) {
            Logger.error("RequestBase error body is null");
            reject({status: -100, data: `请求body为空`});
          }
      
          resolve(body);
        } catch(e) {
          Logger.error("RequestBase error: ", e);
          reject({status: -100, data: `请求异常，${e}`});
        }
      })
    } catch (e) {
      Logger.error("request promise error: ", e);
      reject({status: -100,
        data: `请求异常`});
    }
    
  })
}


module.exports = Request;

const puppeteer = require('puppeteer');
const logger = require('../Logger');
const findChrome = require('carlo/lib/find_chrome');
const AccountManager = require("../Account/index");
const { sleep } = require('../utils');
const Request = require('../utils/Request');
const { BIZ_DOMAIN } = require("../Config/index");

class Common {
  browser;

  newPage = async (options = { width: 1580, height: 900 }) => {
    if (!this.browser) {
      console.log("initBrowser before");
      await this.initBrowser(options);
      console.log("initBrowser end");
    }

    const page = await this.browser.newPage();

    await this.settingPage(page);

    page.on('error', () => {
      logger.info("页面出现异常");
    })

    page.on('close', () => {
      logger.info('页面被关闭');
      global.running = false;
    });

    return page;
  }

  initBrowser = async (options = {
    width: 1580,
    height: 900,
  }) => {
    try {
      const { width, height } = options;
      const args = [
        // '--start-fullscreen',
        '--disable-notifications=true',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        `--window-size=${width},${height}`,
        `--disable-gpu`,
        `--disable-dev-shm-usage`
      ];

      console.log("1111");
      let chromeInfo = await findChrome({});
      let executablePath = chromeInfo.executablePath;
      console.log("executablePath: ", executablePath);
      this.browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        args
      });
      console.log("2222");

      this.browser.on('disconnected', () => {
        logger.info('puppeteer disconnected 浏览器异常退出')
      });

      this.browser.on('targetdestroyed', () => {
        logger.info('puppeteer targetdestroyed 正常退出');
        logger.info(`当前还剩 ${this.browser.targets().length} 个page`);
      })
    } catch (e) {
      console.log(`browser 启动失败##`, e);
      logger.error(`browser 启动失败##`, e);
    }
  }

  settingPage = async (page) => {
    await page.evaluateOnNewDocument(() => {
      const newProto = navigator.__proto__;
      delete newProto.webdriver; //删除 navigator.webdriver字段
      navigator.__proto__ = newProto;

      Object.defineProperty(navigator, 'userAgent', {
        //userAgent在无头模式下有headless字样，所以需覆盖
        get: () =>
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin },
            1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin },
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ]
      });

      window.chrome = {
        app: {},
        loadTimes: () => { },
        csi: () => { },
        runtime: {}
      }
    });
  }

  settingPage = async (page) => {
    await page.evaluateOnNewDocument(() => {
      const newProto = navigator.__proto__;
      delete newProto.webdriver; //删除 navigator.webdriver字段
      navigator.__proto__ = newProto;

      Object.defineProperty(navigator, 'userAgent', {
        //userAgent在无头模式下有headless字样，所以需覆盖
        get: () =>
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin },
            1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin },
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ]
      });

      window.chrome = {
        app: {},
        loadTimes: () => { },
        csi: () => { },
        runtime: {}
      }
    });
  }

  /**
 * 获取当前active的页面
 * @param {number} timeout 超时时间
 * @returns {Promise<puppeteer.Page>}
 */
  getCurrentPage = async (timeout = 2000) => {
    if (!this.browser) throw ("没有找到浏览器实例");
    let start = new Date().getTime();
    while (new Date().getTime() - start < timeout) {
      let pages = await this.browser.pages();
      let result;
      for (const p of pages) {
        if (await p.evaluate(() => document.visibilityState == 'visible')) {
          result = p;
          break;
        }
      }
      if (result) return result;
    }
    throw "找不到当前页面";
  }

  closeWindow = async () => {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  waitElement = async (xpath, document, num = 10) => {
    let [element] = await document.$x(xpath);
    let time = 0;
    while (!element) {
      await sleep(500);
      [element] = await document.$x(xpath);
      time += 1;

      if (time > num)
        return
    }

    return element;
  }

  waitElements = async (xpath, document, num = 10) => {
    let elements = await document.$x(xpath);
    let time = 0;
    while (elements.length == 0) {
      await sleep(500);
      elements = await document.$x(xpath);
      time += 1;

      if (time > num)
        return []
    }

    return elements;
  }

  /**
   * 给页面设置cookies
   * @param {puppeteer.Page} page 
   * @param {string} account_id 
   * @returns {Promise<boolean>} 是否成功setcookie
   */
  async setCookies(page, account_id) {
    const result = await AccountManager.setCookies(page, account_id);
    if (result) {
      await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    }
    return result;
  }
  
  // queryAccountId = async (platformType, id) => {
  //   const { status, data, msg } = await Request({
  //     url: `${BIZ_DOMAIN}/recruit/account/query`,
  //     data: {
  //       platformType: platformType,
  //       platformID: id
  //     },
  //     method: 'POST'
  //   });

  //   if (status === 0 && data) {
  //     logger.info(`${platformType} ${id} 获取accountID: ${data.accountID}`);
  //     return data.accountID;
  //   } else {
  //     logger.error(`${platformType} ${id} 查询账户获取accountID失败`, status, msg);
  //   }
  // }

  queryAccountId = async (platformType, id) => {
    return "account_" + platformType + "_" + id;
  }

  toPage = async (url) => {
    try {
        await this.page.goto(url, { waitUntil: 'networkidle2' });
    } catch (e) {
        logger.error(`脉脉跳转页面异常,错误为:`, e);
    }
  }

  injectCookies = async (accountID, url) => {
    if (accountID) {
      logger.info(`${accountID} 准备注入cookie`);
      await this.setCookies(this.page, accountID).catch(err => { console.log(err) });
      await this.toPage(this.loginUrl);
      await sleep(2000);
    }
  }
}

module.exports = Common;
const path = require("path");
const puppeteer = require('puppeteer');
const logger = require('../Logger');
const findChrome = require('carlo/lib/find_chrome');
const AccountManager = require("../Account/index");
const { sleep } = require('../utils');
const Request = require('../utils/Request');
const { BIZ_DOMAIN } = require("../Config/index");

const ProcessControl = require("../ProcessControl/index");
const ExtensionHelper = require("../Extension/index");

class Common {
  /** @type {import("puppeteer").Browser} 浏览器实例 */
  browser;
  /** @type {import("puppeteer").WebWorker} 扩展程序WebWorker实例 */
  extension;
  /** @type {ExtensionHelper} 扩展程序WebWorker管理 */
  ExtensionHelper = ExtensionHelper;

  newPage = async (options = { width: 1580, height: 900 }) => {
    if (!this.browser) {
      await this.initBrowser(options);
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
        `--disable-dev-shm-usage`,
        `--disable-extensions-except=${ExtensionHelper.EXTENSION_PATH}`, // 扩展程序
        `--load-extension=${ExtensionHelper.EXTENSION_PATH}`, // 扩展程序
      ];

      let chromeInfo = await findChrome({});
      let executablePath = chromeInfo.executablePath;
      this.browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        waitForInitialPage: false,
        args,
      });

      return this.saveExtensionTarget()
        .then(() => {
          this.browser.on('disconnected', () => {
            logger.info('puppeteer disconnected 浏览器异常退出')
          });

          this.browser.on('targetdestroyed', () => {
            logger.info('puppeteer targetdestroyed 正常退出');
            logger.info(`当前还剩 ${this.browser.targets().length} 个page`);
          });

          this.browser.on("disconnected", () => {
            logger.info(`已关闭浏览器`);
            ProcessControl && ProcessControl.close(); // 关闭当前进程
          })
        })
        .catch((err) => {
          console.log("保存扩展程序失败:", err);
          this.browser.close();
          this.browser.disconnect();
          this.browser = null;
          console.log("正在重新加载浏览器");
          return this.initBrowser(options);
        })
    } catch (e) {
      console.log(`browser 启动失败##`, e);
      logger.error(`browser 启动失败##`, e);
    }
  }

  /**
   * 保存扩展程序
   * @returns {Promise<import("puppeteer").WebWorker>}
   */
  async saveExtensionTarget() {
    return new Promise((rs, rj) => {
      let timer = setTimeout(() => { // 等2秒，如果还没有找到扩展程序，则抛出异常
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (!this.extension) {
          rj("没有找到扩展程序");
        }
      }, 2000);
        this.browser.waitForTarget(target => target.type() === puppeteer.TargetType.SERVICE_WORKER)
          .then(extensionTarget => extensionTarget.worker())
          .then(extension => {
            this.extension = extension;
            ExtensionHelper.initializeWithExtension(extension);
            rs(extension);
          })
          .catch(err => {
            rj && rj(err)
          })

    })
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

  /**
   * 寻找一个元素
   * @param {string} xpath xpath语句
   * @param {puppeteer.Page | puppeteer.ElementHandle} document 页面实例或节点handle
   * @param {?number} num 最大寻找次数-间隔500毫秒
   * @returns {Promise<puppeteer.ElementHandle<Node>>}
   */
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

  /**
   * 寻找返回多个元素
   * @param {string} xpath xpath语句
   * @param {puppeteer.Page | puppeteer.ElementHandle} document 页面实例或节点handle
   * @param {?number} num 最大寻找次数-间隔500毫秒
   * @returns {Promise<(puppeteer.ElementHandle<Node>)[]>}
   */
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
      await page.reload({ waitUntil: ["domcontentloaded"] });
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
      await this.page.setDefaultNavigationTimeout(0);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      logger.error(`跳转页面异常,错误为:`, e);
    }
  }

  /**
   * 向当前页面注入cookies，并跳转到指定页面
   * @param {number | string} accountID 账号id 
   * @param {?string} url 指定页面url(如果没有，则跳转到登录页) 
   */
  injectCookies = async (accountID, url) => {
    if (accountID) {
      logger.info(`${accountID} 准备注入cookie`);
      await this.setCookies(this.page, accountID).catch(err => { console.log(err) });
      await this.toPage(url || this.loginUrl);
      await sleep(2000);
    }
  }

  /**
   * 设定浏览器下载路径
   */
  setDownloadPath = async () => {
    const downloadPath = path.join(process.cwd(), this.userInfo.accountID.toString());
    try {
      const client = await this.page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      });
    }
    catch (e) {
      logger.error("设定浏览器下载路径异常: ", e)
    }
  }
}

module.exports = Common;
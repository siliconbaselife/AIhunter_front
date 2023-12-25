const puppeteer = require('puppeteer');
const logger = require('../Logger');
const findChrome = require('carlo/lib/find_chrome');

class Common {
    browser;

    newPage = async (options = {width: 1580, height: 900}) => {
        if (!this.browser) {
            await this.initBrowser(options);
        }

        console.log(this.browser);

        const page = await this.browser.newPage();

        await this.settingPage(page);

        page.on('error', () => {
            logger.info("页面出现异常");
        })

        page.on('close', () => {
            logger.info('页面被关闭');
        });

        return page;
    }

    initBrowser = async (options = {
      width: 1580,
      height: 900,
    }) => {
        try {
            const { width, height} = options;
            const args = [
                '--disable-notifications=true',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                `--window-size=${width},${height}`,
                `--disable-gpu`,
                `--disable-dev-shm-usage`
            ];

            let chromeInfo = await findChrome({});
            let executablePath = chromeInfo.executablePath;
            this.browser = await puppeteer.launch({
                executablePath: executablePath,
                headless: false,
                defaultViewport: null,
                ignoreHTTPSErrors: true,
                args
            });

            this.browser.on('disconnected', () => {
                logger.info('puppeteer disconnected 浏览器异常退出')
            });

            this.browser.on('targetdestroyed', () => {
                logger.info('puppeteer targetdestroyed 正常退出');
                logger.info(`当前还剩 ${this.browser.targets().length} 个page`);
            })
        } catch (e) {
          logger.error(`启动失败##`, e);
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
                  0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
                  description: "Portable Document Format",
                  filename: "internal-pdf-viewer",
                  length: 1,
                  name: "Chrome PDF Plugin"
                },
                {
                  0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
                  description: "",
                  filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                  length: 1,
                  name: "Chrome PDF Viewer"
                },
                {
                  0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
                  1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
                  description: "",
                  filename: "internal-nacl-plugin",
                  length: 2,
                  name: "Native Client"
                }
              ]
            });
      
            window.chrome = {
              app: {},
              loadTimes: () => {},
              csi: () => {},
              runtime: {}
            }
        });
    }


    closeWindow = async () => {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
    }
}

module.exports = Common;
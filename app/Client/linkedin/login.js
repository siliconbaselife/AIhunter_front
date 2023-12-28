const Base = require('./Base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');

class Login extends Base {
    getUserInfo = async () => {
        const getUser = async (response) => {
            const url = response.url();
            if (url.startsWith('https://www.linkedin.com/litms/api/metadata/user')) {
              const data = await response.json();
              logger.info("linkedin getUser data:", data);
              if (!data.id)
                return

              if (data.id.dmp) {
                  this.userInfo = {
                    id: data.id.dmp
                  };
              }
            }
        }
        this.page.on('response', getUser);

        return new Promise((resolve, reject) => {
            const check = async () => {
                await sleep(1000);
                if (this.pageClose) {
                  return reject();
                }
        
                if (this.userInfo) {
                  this.page.removeListener('response', getUser);
                  Logger.info(`linkedin getUserInfo success: ${this.userInfo}`);
                  return resolve();
                }
                check();
            };
            try {
                check();
            } catch (e) {
                logger.error("linkedin login init error: ", e);
            }
        });
    }

    doLogin = async () => {
        this.getUserInfo();

        try {
            await this.page.goto(this.loginUrl, {
              waitUntil: 'networkidle2'
            });
        } catch (e) {
            logger.error(`linkedin 跳转登录页超时，错误为: `, e);
        }

        while(!this.userInfo) {
            await sleep(2000);
            logger.info("linkedin 等待登陆");
        }

        let name = await this.getName();
        this.userInfo.name = name;

        logger.info("linkedin 登陆成功: ", this.userInfo);
    }

    getName = async() => {
      let btn = await this.waitElement(`//button[contains(@class, 'global-nav__primary-link') and contains(@class, 'global-nav__primary-link-me-menu-trigger')]`);
      await btn.click();
      await sleep(1000);

      let imgBlock = await this.waitElement(`//img[contains(@class, "global-nav__me-photo")]`);
      let name = await this.page.evaluate(node => node.alt, imgBlock);
      logger.info("linkedin getName name: ", name);

      await this.refresh();
  
      return name;
    }
}

module.exports = Login;
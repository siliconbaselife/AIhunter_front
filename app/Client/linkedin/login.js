const Base = require('./Base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');
const AccountManager = require("../../Account/index");

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
                  logger.info(`linkedin getUserInfo success: ${JSON.stringify(this.userInfo)}`);
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

    dologin = async (accountID) => {
        this.getUserInfo();
        await this.toPage(this.loginUrl);
        
        if (accountID)
            await this.injectCookies(accountID, this.loginUrl);

        while(!this.userInfo) {
            await sleep(2000);
            logger.info("linkedin 等待登陆");
        }

        let generateAccountID = await this.queryAccountId("Linkedin", this.userInfo.id);
        if (accountID && accountID != generateAccountID)
            throw new Error(`linkedin登陆异常 accountID不匹配 accountID: ${accountID} generateAccountID: ${generateAccountID}`);

        accountID = generateAccountID;
        if (!accountID)
            throw new Error(`linkedin登陆 没有accountID`);

        let name = await this.getName();
        this.userInfo.name = name;

        this.userInfo.accountID = accountID;

        await AccountManager.setAccountInfo(this.userInfo.accountID, this.userInfo, this.page);
        logger.info("linkedin 登陆成功: ", this.userInfo);
    }

    getName = async() => {
      let btn = await this.waitElement(`//button[contains(@class, 'global-nav__primary-link') and contains(@class, 'global-nav__primary-link-me-menu-trigger')]`, this.page);
      await btn.click();
      await sleep(1000);

      let imgBlock = await this.waitElement(`//img[contains(@class, "global-nav__me-photo")]`, this.page);
      let name = await this.page.evaluate(node => node.alt, imgBlock);
      logger.info("linkedin getName name: ", name);

      await this.refresh();
  
      return name;
    }
}

module.exports = Login;
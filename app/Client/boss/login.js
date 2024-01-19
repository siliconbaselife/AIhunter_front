const Base = require('./base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');
const AccountManager = require("../../Account/index");

class Login extends Base {
    getUserInfo = async () => {
        const getUser = async (response) => {
            const url = response.url();
            if (url.startsWith('https://www.zhipin.com/wapi/batch/batchRunV3')) {
                const data = await response.json();
                if (!data.zpData)
                    return;

                if ("/wapi/zpuser/wap/getUserInfo.json" in data.zpData) {
                    try{
                        let userData = data.zpData["/wapi/zpuser/wap/getUserInfo.json"];
                        let id = userData.zpData.userId;
                        let name = userData.zpData.name;
                        logger.info(`boss 获取到 id: ${id} name: ${name}`);
                        this.userInfo = {id: id, name: name};
                    } catch (e) {
                        logger.error(`getUserInfo request error: `, e);
                    }
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
                  return resolve();
                }
                check();
            };

            try {
                check();
            } catch (e) {
                logger.error("boss login error: ", e);
            }
        });
    }

    dologin = async (accountID) => {
        this.getUserInfo();
        await this.toPage(this.loginUrl);

        if (accountID)
            await this.injectCookies(accountID, this.loginUrl);

        while (!this.userInfo) {
            await sleep(2000);
            logger.info("boss等待登陆");
        }

        let generateAccountID = await this.queryAccountId("Boss", this.userInfo.id);
        if (accountID && accountID != generateAccountID)
            throw new Error(`boss 登陆异常 accountID不匹配 accountID: ${accountID} generateAccountID: ${generateAccountID}`);

        accountID = generateAccountID;
        if (!accountID)
            throw new Error(`boss登陆 没有accountID`);

        this.userInfo.accountID = accountID;

        await AccountManager.setAccountInfo(this.userInfo.accountID, this.userInfo, this.page);
        logger.info(`boss登陆成功 accountID: ${this.userInfo.accountID} id: ${this.userInfo.id} name: ${this.userInfo.name}`);
    }
}

module.exports = Login;
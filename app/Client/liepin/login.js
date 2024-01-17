const Base = require('./base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');
const AccountManager = require("../../Account/index");

class Login extends Base {
    /** @type {id: string | number, name: string} */
    userInfo;

    getUserInfo = async () => {
        const getUser = async (response) => {
            const url = response.url();
            const method = response.request().method().toUpperCase();
            if (
                url.indexOf('com.liepin.im.common.login-user-info') !== -1
                && method !== "OPTION"
            ) {
                const res = await response.json();
                const data = res.data || {};
                const { userId, userName } = data;
                if (!(userId && userName)) return
                logger.info(`liepin 获取到 id: ${userId} name: ${userName}`);
                this.userInfo = { id: userId, name: userName };
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
                logger.error("liepin login error: ", e);
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
            logger.info("liepin等待登陆");
        }

        let generateAccountID = await this.queryAccountId("liepin", this.userInfo.id);
        if (accountID && accountID != generateAccountID) throw new Error(`liepin 登陆异常 accountID不匹配 accountID: ${accountID} generateAccountID: ${generateAccountID}`);

        accountID = generateAccountID;
        if (!accountID) throw new Error(`liepin登陆 没有accountID`);

        this.userInfo.accountID = accountID;

        await AccountManager.setAccountInfo(this.userInfo.accountID, this.userInfo, this.page);
        logger.info(`liepin登陆成功 accountID: ${this.userInfo.accountID} id: ${this.userInfo.id} name: ${this.userInfo.name}`);
    }
}

module.exports = Login;
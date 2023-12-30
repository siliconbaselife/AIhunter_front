const Base = require('./Base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');
const AccountManager = require("../../Account/index");

class Login extends Base {
    getUserInfo = async () => {
        const getUser = async (response) => {
            const url = response.url();
            if (url.startsWith('https://maimai.cn/bizjobs/company/manage/get_admin_current?channel')) {
                const data = await response.json();
                logger.info("脉脉 getUser data:", data);
                if (!data.result || data.result != "ok")
                    return

                let name = data.data.ucard.name;
                let uid = data.data.ucard.id;

                this.maimaiUserInfo = {id: uid, name: name};
            }
        }
        this.page.on('response', getUser);

        return new Promise((resolve, reject) => {
            const check = async () => {
                await sleep(1000);
                if (this.pageClose) {
                    return reject();
                }
        
                if (this.maimaiUserInfo) {
                  this.page.removeListener('response', getUser);
                  return resolve();
                }
                check();
            };

            try {
                check();
            } catch (e) {
                logger.error("脉脉login error: ", e);
            }
        });
    }

    /**
     * 去登录
     * @param {?string} accountID
     */
    dologin = async (accountID) => {
        //这个函数不要await
        this.getUserInfo();
        await this.toPage(this.loginUrl);

        await this.injectCookies(accountID, this.loginUrl);

        while (!this.maimaiUserInfo) {
            await sleep(2000);
            logger.info("脉脉等待登陆");
        }

        if (!accountID) {
            accountID = await this.queryAccountId("maimai", this.maimaiUserInfo.id);
        }
        if (!accountID)
            throw new Error(`买卖登陆 没有accountID`);

        this.maimaiUserInfo.accountID = accountID;

        await AccountManager.setAccountInfo(this.maimaiUserInfo.accountID, this.maimaiUserInfo, this.page);
        logger.info(`脉脉登陆成功 accountID: ${this.maimaiUserInfo.accountID} id: ${this.maimaiUserInfo.id} name: ${this.maimaiUserInfo.name}`);
    }
}

module.exports = Login;
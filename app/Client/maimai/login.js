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

                this.maimaiUserInfo = { id: uid, name: name };
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
     * @param {?string} account_id
     */
    dologin = async (account_id) => {
        //这个函数不要await
        this.getUserInfo();
        try {
            await this.page.goto(this.loginUrl, { waitUntil: 'networkidle2' });
        } catch (e) {
            logger.error(`脉脉跳转登录页超时，错误为:`, e);
        }

        if (account_id) {
            console.log("account_id123", account_id);
            const accountInfo = AccountManager.getAccountInfo(account_id);
            if (accountInfo) {
                const result = await this.setCookies(this.page, account_id).catch(err => { console.log("1234544", err) });
                this.maimaiUserInfo = accountInfo;
                console.log("result", result);
                console.log("account_id", account_id)
                return;
            }
        }

        while (!this.maimaiUserInfo) {
            await sleep(2000);
            logger.info("脉脉等待登陆");
        }

        // 储存账号信息到本地
        const { id, name } = this.maimaiUserInfo;
        AccountManager.setAccountInfo(id, { id, name }, this.page);

        logger.info("脉脉登陆成功 userInfo: ", this.maimaiUserInfo);
    }
}

module.exports = Login;
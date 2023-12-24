const Base = require('./Base');
const { sleep } = require('../../utils');
const logger = require('../../Logger');

class Login extends Base {
    getUserInfo = async () => {
        const getUser = async (response) => {
            const url = response.url();
            if (url.startsWith('https://maimai.cn/bizjobs/company/manage/get_admin_current?channel')) {
              const data = await response.json();
              Logger.info("脉脉 getUser data:", data);
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
                Logger.error("脉脉login error: ", e);
            }
        });
    }

    dologin = async () => {
        await this.getUserInfo();
  
        try {
            await this.page.goto(this.loginUrl, {waitUntil: 'networkidle2'});
        } catch (e) {
            logger.error(`脉脉跳转登录页超时，错误为:`, e);
        }
  
        while(!this.maimaiUserInfo) {
            await sleep(2000);
            Logger.info("脉脉等待登陆");
        }
  
        Logger.info("脉脉登陆成功 userInfo: ", this.maimaiUserInfo);
    }
}

module.exports = Login;
const { sleep } = require('../../utils');
const logger = require('../../Logger');
const Login = require('./login');
const Common = require('../common');

const ProcessControl = require("../../ProcessControl/index");
const Search = require('./search');

class Client {
    userInfo;
    options;
    common = new Common();

    loginPage = async (account_id) => {
        this.page = await this.common.newPage({
            width: 1792,
            height: 984,
        });
        this.options = this.options || {};
        this.options.page = this.page;
        this.options.browser = this.common.browser;
        this.options.extension = this.common.extension;

        this.login = new Login(this.options);
        await this.login.dologin(account_id);

        this.userInfo = this.login.userInfo;
        this.options.userInfo = this.userInfo;

    }

    bind = async () => {
        await this.loginPage();
        return this.userInfo;
    }

    getUserInfo = async () => {
        return this.userInfo;
    }

    run = async (account_id) => {
        global.running = true;
        logger.info("liepin启动");

        await this.loginPage(account_id);
        logger.info("liepin 登陆完成");
        await sleep(2 * 1000);

        let search = new Search(this.options);
        await search.run();
        logger.info(`linkedin ${this.userInfo.name} 打招呼任务执行完成`);

        logger.info(`liepin ${this.userInfo.name} 要退出了`);
    }
}

module.exports = Client;
const Resume = require('./Resume');
const Login = require('./login');
const { sleep } = require('../../utils');
const Chat = require('./Chat');
const logger = require('../../Logger');
const Common = require('../common');
const AccountManager = require("../../Account/index");

class Client {
    userInfo;
    options;
    common = new Common();

    /**
     * 获取账号信息accountInfo
     * @param {?string} account_id
     * @returns {{id: string, name: string}} 账号信息accountInfo 
     */
    loginPage = async (account_id) => {
        let split_account_id = account_id.split("_").pop();
        this.page = await this.common.newPage({
            width: 1792,
            height: 984,
        });
        this.options = this.options || {};
        this.options.page = this.page;
        this.login = new Login(this.options);
        await this.login.dologin(split_account_id);
        this.userInfo = this.login.maimaiUserInfo
        this.options.userInfo = this.userInfo;
        return this.userInfo;
    }

    bind = async () => {
        await this.loginPage();
        return this.userInfo;
    }

    getUserInfo = async () => {
        return this.userInfo;
    }

    /**
     * 执行任务
     * @param {?string} account_id 
     */
    run = async (account_id) => {
        global.running = true;
        console.log("脉脉启动");

        await this.loginPage(account_id);
        console.log("脉脉 登陆完成");
        await sleep(2 * 1000);

        let resume = new Resume(this.options);
        await resume.run();
        logger.info(`脉脉 ${this.userInfo.name} 打招呼任务执行完成`);

        let chat = new Chat(this.options);
        await chat.run();
        logger.info(`脉脉 ${this.userInfo.name} 要退出了`);
    }
}

module.exports = Client;
const Resume = require('./Resume');
const Login = require('./login');
const { sleep } = require('../../utils');
const Chat = require('./Chat');
const Recall = require('./recall');
const logger = require('../../Logger');
const Common = require('../common');

class Client {
    userInfo;
    options;
    common = new Common();

    loginPage = async (account_id) =>  {
        this.page = await this.common.newPage({
            width: 1792,
            height: 984,
        });
        this.options = this.options || {};
        this.options.page = this.page;
        this.login = new Login(this.options);
        await this.login.dologin(account_id);

        this.userInfo = this.login.userInfo;
        this.options.userInfo = this.userInfo;
    }

    bind = async() => {
        await this.loginPage();
        return this.userInfo;
    }

    getUserInfo = async() => {
        return this.userInfo;
    }

    run = async(account_id) => {
        global.running = true;
        logger.info("linkedin启动");

        await this.loginPage(account_id);
        logger.info("linkedin 登陆完成");
        await sleep(2 * 1000);

        let chat = new Chat(this.options);
        logger.info(`linkedin ${this.userInfo.name} 初步沟通`);
        // await chat.chatList();

        let resume = new Resume(this.options);
        await resume.run();
        logger.info(`linkedin ${this.userInfo.name} 打招呼任务执行完成`);

        let recall = new Recall(this.options);
        // await recall.run();
        logger.info(`linkedin ${this.userInfo.name} 二次召回任务执行完成`);

        // await chat.run();
        logger.info(`linkedin ${this.userInfo.name} 要退出了`);
    }
}

module.exports = Client;
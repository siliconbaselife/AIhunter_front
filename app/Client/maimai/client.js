const Resume = require('./Resume');
const Login = require('./login');
const Chat = require('./Chat');
const Common = require('../common');
const logger = require('../../Logger');

class Client {
    userInfo;
    options;

    constructor() {
        global.running = true;
    }

    login = async () =>  {
        this.page = await this.newPage({
            width: 1792,
            height: 984,
        });

        this.options = this.options || {};
        this.options.page = this.page;
        this.login = new Login(this.options);

        await this.login.doLogin();

        this.userInfo = this.login.maimaiUserInfo
        this.options.userInfo = this.userInfo;
    }

    bind = async() => {
        await this.login();
        return this.userInfo;
    }

    getUserInfo = async() => {
        return this.userInfo;
    }

    run = async() => {
        await this.login();
        let resume = new Resume(this.options);
        await resume.run();
        logger.info(`脉脉 ${this.userInfo.name} 打招呼任务执行完成`);

        let chat = new Chat(this.options);
        await chat.run();
        logger.info(`脉脉 ${this.userInfo.name} 要退出了`);
    }
}

module.exports = new Client();
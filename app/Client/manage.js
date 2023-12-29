const logger = require('../Logger');

class Manage {
    static instance;

    static getInstance() {
        if (!Manage.instance) Manage.instance = new Manage();
        return Manage.instance;
    }

    fetchClient = async(platformType) => {
        if (platformType == "maimai") {
            let client = require(`./${platformType}/client`);
            return client;
        }
    }

    register = async(platformType, account_name, rs, rj) => {
        try {
            let client = await this.fetchClient(platformType);
            const c = new client();
            console.log("client", c);
            let userInfo = await c.bind();
            console.log("已结束", userInfo);
            rs(userInfo);
        } catch (e) {
            logger.error(`账号绑定异常 platformType: ${platformType} account_name: ${account_name} error: `, e);
            rj();
        }
    }

    execute = async(platformType, account_name, account_id) => {
        try {
            let client = await this.fetchClient(platformType);
            await client.run();
        } catch (e) {
            logger.error();
        }
    }
}


module.exports = Manage.getInstance();


const logger = require('../Logger');

class Manage {
    static instance;

    static getInstance() {
        if (!Manage.instance) Manage.instance = new Manage();
        return Manage.instance;
    }

    fetchClient = async(platformType) => {
        if (platformType == "maimai") {
            let Client = require(`./${platformType}/client`);
            let client = new Client();
            return client;
        }
    }

    register = async(platformType, account_name, rs, rj) => {
        try {
            let client = await this.fetchClient(platformType);
            let userInfo = await client.bind();
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


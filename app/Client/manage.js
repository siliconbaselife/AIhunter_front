const logger = require('../Logger');

class Manage {
    static instance;

    static getInstance() {
        if (!Manage.instance) Manage.instance = new Manage();
        return Manage.instance;
    }

    fetchClient = async (platformType) => {
        if (platformType == "maimai") {
            let Client = require(`./${platformType}/client`);
            let client = new Client();
            return client;
        }

        if (platformType == "boss") {
            let Client = require(`./${platformType}/client`);
            let client = new Client();
            return client;
        }
    }

    register = async (platformType, account_name, rs, rj) => {
        try {
            let client = await this.fetchClient(platformType);
            let userInfo = await client.bind()
            rs(userInfo);
        } catch (e) {
            logger.error(`账号绑定异常 platformType: ${platformType} account_name: ${account_name} error: `, e);
            rj(e);
        }
    }

    execute = async (platformType, account_name, account_id) => {
        try {
            console.log(`执行 ${platformType} ${account_name} ${account_id}`);
            let client = await this.fetchClient(platformType);
            await client.run(account_id);
        } catch (e) {
            logger.error(`执行账号异常 platformType: ${platformType} account_name: ${account_name} account_id: ${account_id} error: `, e);
        }
    }
}


module.exports = Manage.getInstance();


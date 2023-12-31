const Common = require('../common');
const logger = require('../../Logger');

class Base extends Common {
    loginUrl = "https://maimai.cn/ent/v41/index";

    constructor(options) {
        super();
        logger.info(`maimai base options: ${JSON.stringify(options)}`);

        this.options = options || {};
        const {page, browser, userInfo} = this.options;

        this.browser = browser;
        this.page = page;

        if (userInfo)
            logger.info(`maimai userInfo: ${JSON.stringify(userInfo)}`);
            this.userInfo = userInfo;
    }
}

module.exports = Base;
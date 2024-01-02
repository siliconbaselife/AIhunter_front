const Common = require('../common');
const logger = require('../../Logger');

class Base extends Common {
    loginUrl = "https://www.zhipin.com/web/user/";

    constructor(options) {
        super();
        logger.info(`boss base options: ${JSON.stringify(options)}`);

        this.options = options || {};
        const {page, browser, userInfo} = this.options;

        this.browser = browser;
        this.page = page;

        if (userInfo)
            logger.info(`boss userInfo: ${JSON.stringify(userInfo)}`);
            this.userInfo = userInfo;
    }
}

module.exports = Base;
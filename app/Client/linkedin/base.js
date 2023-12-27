const Common = require('../common');
const logger = require('../../Logger');

class Base extends Common {
    loginUrl = "https://www.linkedin.com/litms/api/metadata/user";

    constructor(options) {
        super();
        logger.info(`linkedin base options: ${JSON.stringify(options)}`);

        this.options = options || {};
        const {page, browser, userInfo} = this.options;

        this.browser = browser;
        this.page = page;

        if (userInfo)
            logger.info(`linkedin userInfo: ${JSON.stringify(userInfo)}`);
            this.userInfo = userInfo;
    }

    closeAllMsgDivs = async() => {

    }
}

module.exports = Base;
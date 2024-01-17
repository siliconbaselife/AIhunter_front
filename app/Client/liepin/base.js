const Common = require('../common');
const logger = require('../../Logger');

class Base extends Common {
    /** @type {import("puppeteer").Browser;} */
    browser;
    /** @type {import("puppeteer").Page;} */
    page;

    indexUrl = "https://h.liepin.com/";
    loginUrl = "https://h.liepin.com/account/login";



    constructor(options) {
        super();
        logger.info(`liepin base options: ${JSON.stringify(options)}`);

        this.options = options || {};
        const {page, browser, userInfo} = this.options;

        this.browser = browser;
        this.page = page;

        if (userInfo)
            logger.info(`liepin userInfo: ${JSON.stringify(userInfo)}`);
            this.userInfo = userInfo;
    }
}

module.exports = Base;
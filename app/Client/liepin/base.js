/** @typedef {{jobID: string, taskType: string, helloSum: number, filter: {search_text: string, hello_sum: number, education: string[], location: string[], industry: string[], ex_company: string[], sex: string, min_work_year: string, max_work_year: string, min_age: string | number, max_age: string | number}, touch_msg: string}} Task 单个任务 */

const Common = require('../common');
const logger = require('../../Logger');

class Base extends Common {
    /** @type {import("puppeteer").Browser;} */
    browser;
    /** @type {import("puppeteer").Page;} */
    page;

    indexUrl = "https://h.liepin.com/";
    findPeopleUrl = "https://h.liepin.com/search/getConditionItem"; // 找人页面
    chatUrl = "https://h.liepin.com/im/showmsgnewpage?tab=message"; // 沟通页面
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
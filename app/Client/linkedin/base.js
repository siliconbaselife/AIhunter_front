const Common = require('../common');
const logger = require('../../Logger');
const { sleep } = require('../../utils');

class Base extends Common {
    loginUrl = "https://www.linkedin.com/"

    constructor(options) {
        super();
        logger.info(`linkedin base options: ${JSON.stringify(options)}`);

        this.options = options || {};
        const {page, browser, userInfo, extension} = this.options;

        this.browser = browser;
        this.page = page;

        if (extension)
            this.extension = extension;

        if (userInfo)
            logger.info(`linkedin userInfo: ${JSON.stringify(userInfo)}`);
            this.userInfo = userInfo;
    }

    closeAllMsgDivs = async() => {
        let msgDivs = await this.page.$x(`//div[contains(@role, "dialog")]`);
        logger.info(`linkedin ${this.userInfo.name} 有 ${msgDivs.length} 个消息框需要关闭`);

        while(msgDivs.length > 0) {
            for (let msgDiv of msgDivs) {
                let closeBtn = msgDiv.$x(`//button[contains(@class, "msg-overlay-bubble-header__control") and not(contains(@class, "msg-overlay-conversation-bubble__expand-btn"))]`);
                await closeBtn.click();
                await sleep(200);
            }

            msgDivs = await this.page.$x(`//div[contains(@role, "dialog")]`);
        }
    }

    refresh = async() => {
        let homeBtn = await this.waitElement(`//span[contains(@title, "Home") and text() = "Home"]`, this.page);
        await homeBtn.click();
    }

    minConversation = async() => {
        let [openBtn] = await this.page.$x(`//button[contains(@class, "msg-overlay-bubble-header__control")]/span[text() = "You are on the messaging overlay. Press enter to minimize it."]`);
        if (!openBtn)
            return;
        await openBtn.click();
        await sleep(1000);
    }
}

module.exports = Base;
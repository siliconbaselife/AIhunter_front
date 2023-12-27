const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Recall extends Search {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }

    run = async() => { 
        logger.info(`linkedin ${this.userInfo.name} 二次召回，开始执行任务`);
        let tasks = await this.queryTasks();
        logger.info(`linkedin ${this.userInfo.name} 获取到 ${tasks.length} 个二次召回任务, 任务如下: ${JSON.stringify(tasks)}`);

        for (let index in tasks) {
            let task = tasks[index];

            logger.info(`linkedin ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个二次召回任务`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`linkedin ${this.userInfo.name} 二次召回任务 ${parseInt(index) + 1} 出现异常失败: `, e)
            }
        }
    }

    dealTask = async(task) => {
        await this.setFilter(task);
        await this.noopTask(task);
        await this.refresh();
    }

    noopTask = async(task) => {
        let page = 1;
        while(true) {
            logger.info(`linkedin ${this.userInfo.name} 当前二次召回任务处理到第 ${page} 页`);
            await this.dealPeople(task);
    
            await this.closeAllMsgDivs();

            let hasNext = await this.nextPage();
            if (!hasNext)
                break;

            page += 1;
            if (!global.running)
                return;
        }
    }

    dealPeople = async(task) => {
        let peopleItems = await this.page.$x(`//li[contains(@class, "reusable-search__result-container")]`);
        logger.info(`linkedin ${this.userInfo.name} 二次召回搜索到 ${peopleItems.length} 个people item`);

        for (let peopleItem of peopleItems) {
            let msgBtn = await this.waitElement(`//span[text() = "Message"]`, peopleItem);
            let nameSpan = await peopleItem.$x(`//span[contains(@class, "entity-result__title-text")]//span[contains(@dir, "ltr")]//span[1]`);
            let name = await this.page.evaluate(node => node.innerText, nameSpan);
            if (!msgBtn) {
                logger.info(`linkedin ${this.userInfo.name} ${name} 异常,没有message按钮`);
                continue;
            }

            try {
                await this.dealOnePeople(peopleItem, task);
            } catch(e) {
                logger.error(`linkedin ${this.userInfo.name} ${name} 发二次召回消息异常:`, e);
            }

            await this.closeAllMsgDivs();
        }
    }

    dealOnePeople = async(peopleItem, task) => {
        let msgBtn = await peopleItem.$x(`//span[text() = "Message"]`);
        await msgBtn.click();

        let msgDiv = await this.waitElement(`//div[contains(@class, "msg-form__contenteditable") and contains(@aria-label, "Write a message…")]`);
        await msgDiv.click();
        await this.page.keyboard.type(task.touch_msg);
        await sleep(200);
        let [sendBtn] = await this.page.$x(`//button[contains(@class, "msg-form__send-button") and text() = "Send"]`);
        await sendBtn.click();
        await sleep(300);
    }
}
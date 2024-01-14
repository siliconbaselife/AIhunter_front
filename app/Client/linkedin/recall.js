const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const Search = require("./search");

class Recall extends Search {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }

    run = async() => { 
        logger.info(`linkedin ${this.userInfo.name} 二次召回，开始执行任务`);
        let tasks = await this.queryTasks();
        logger.info(`linkedin ${this.userInfo.name} 获取到 ${tasks.length} 个二次召回任务, 任务如下: ${JSON.stringify(tasks)}`);
        await this.minConversation();

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
        await this.dealTaskBefore(task);
        await this.setOneDegree();
        await this.noopTask(task);
        await this.refresh();
    }

    setOneDegree = async() => {
        let locationBtn = await this.waitElement(`//button[text() = "Connections"]`, this.page);
        await locationBtn.click();

        let mainDiv = await this.waitElement(`//div[contains(@class, "artdeco-hoverable-content--visible")]`, this.page);
        let oneDegreeBtn = await this.waitElement(`//span[contains(@class, "t-14") and text() = "1st"]`, mainDiv);
        await oneDegreeBtn.click();

        let [showBtn] = await mainDiv.$x(`//button[contains(@data-control-name, "filter_show_results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }


    noopTask = async(task) => {
        let page = 1;
        while(true) {
            logger.info(`linkedin ${this.userInfo.name} 当前二次召回任务处理到第 ${page} 页`);
            await this.dealPeople();
    
            await this.closeAllMsgDivs();

            let hasNext = await this.nextPage();
            if (!hasNext)
                break;

            page += 1;
            if (!global.running)
                return;
        }
    }

    dealPeople = async() => {
        let peopleItems = await this.page.$x(`//li[contains(@class, "reusable-search__result-container")]`);
        logger.info(`linkedin ${this.userInfo.name} 二次召回搜索到 ${peopleItems.length} 个people item`);

        for (let peopleItem of peopleItems) {
            let msgBtn = await this.waitElement(`//span[text() = "Message"]`, peopleItem);
            let nameSpan = await peopleItem.$x(`//span[contains(@class, "entity-result__title-text")]//span[contains(@dir, "ltr")]//span[1]`);
            let name = await this.page.evaluate(node => node.innerText, nameSpan);
            await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), peopleItem);
            await sleep(300);
            if (!msgBtn) {
                logger.info(`linkedin ${this.userInfo.name} ${name} 异常,没有message按钮`);
                continue;
            }

            let id = await this.fetchPeopleId(peopleItem);
            let recallInfo = await this.filterItem(id);
            if (!recallInfo) {
                logger.info(`linkedin ${this.userInfo.name} id: ${id} 不需要召回`);
                continue;
            }

            try {
                await this.dealOnePeople(peopleItem, recallInfo);
            } catch(e) {
                logger.error(`linkedin ${this.userInfo.name} ${name} 发二次召回消息异常:`, e);
            }

            await this.closeAllMsgDivs();
        }
    }

    filterItem = async (id) => {
        try {
            const { status, data } = await Request({
              url: `${BIZ_DOMAIN}/recruit/candidate/recallList`,
              data: {
                accountID: this.userInfo.accountID,
                candidateIDs: [id],
                candidateIDs_read: []
              },
              headers: {"Connection": "keep-alive"},
              method: 'POST'
            });
            logger.info(`linkedin ${this.userInfo.name} recallList request status: ${status} data: ${data}`);

            if (status == 0) {
                let recallList = data;
                if (recallList.length > 0)
                    return recallList[0];
            }
        } catch (e) {
            logger.error(`linkedin ${this.userInfo.name} recallList request error: `, e);
        }
    }

    dealOnePeople = async(peopleItem, recallInfo) => {
        let msgBtn = await peopleItem.$x(`//span[text() = "Message"]`);
        await msgBtn.click();

        let msgDiv = await this.waitElement(`//div[contains(@class, "msg-form__contenteditable") and contains(@aria-label, "Write a message…")]`);
        await msgDiv.click();
        await this.page.keyboard.type(recallInfo.recall_msg);
        await sleep(200);
        let [sendBtn] = await this.page.$x(`//button[contains(@class, "msg-form__send-button") and text() = "Send"]`);
        await sendBtn.click();
        await sleep(300);
    }
}

module.exports = Recall;
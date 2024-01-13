const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const Search = require("./search");
const Profile = require("./profile");

class Resume extends Search {
    keywordDelay = 40;
    profile;

    constructor(options) {
        super(options)
        this.profile = new Profile(options);
    }

    run = async() => { 
        logger.info(`linkedin ${this.userInfo.name} 打招呼，开始执行打招呼任务`);
        let tasks = await this.queryTasks();
        logger.info(`linkedin ${this.userInfo.name} 获取到 ${tasks.length} 个打招呼任务, 任务如下: ${JSON.stringify(tasks)}`);
        await this.minConversation();

        this.hiEnd = false;
        for (let index in tasks) {
            if (this.hiEnd)
                break;

            let task = tasks[index];

            if (task.helloSum <= 0) {
                logger.info(`linkedin ${this.userInfo.name} 任务 ${parseInt(index) + 1} 已经完成`);
            }

            logger.info(`linkedin ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个任务`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`linkedin ${this.userInfo.name} 任务 ${parseInt(index) + 1} 出现异常失败: `, e)
            }
        }
    }

    dealTask = async(task) => {
        await this.dealTaskBefore(task);
        await this.setFilter(task);
        await this.noopTask(task);
        await this.refresh();
    }

    noopTask = async(task) => {
        let page = 1;
        while(true) {
            if (this.hiEnd)
                break;

            if (task.helloSum <= 0) {
                logger.info(`linkedin ${this.userInfo.name} 今天的指标已经用完`);
                break;
            }

            logger.info(`linkedin ${this.userInfo.name} 当前任务处理到第 ${page} 页`);
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
        let itemsNum = peopleItems.length;
        logger.info(`linkedin ${this.userInfo.name} 搜索到 ${peopleItems.length} 个people item`);

        for (let i = 0; i < itemsNum; i++) {
            peopleItems = await this.page.$x(`//li[contains(@class, "reusable-search__result-container")]`);
            let peopleItem = peopleItems[i];
            if (this.hiEnd)
                break;

            if (task.helloSum <= 0) {
                logger.info(`linkedin ${this.userInfo.name} 今天的指标已经用完`);
                break;
            }

            await this.page.evaluate((item)=>item.scrollIntoView({block: "center"}), peopleItem);
            logger.info(`linkedin ${this.userInfo.name} 还剩 ${task.helloSum} 个招呼`);

            let id = await this.fetchPeopleId();
            logger.info(`linkedin ${this.userInfo.name} 当前处理people: ${id}`);

            try {
                await this.dealOnePeople(id, task, peopleItem);
            } catch (e) {
                logger.error(`linkedin ${this.userInfo.name} id: ${id} dealOnePeople error: `, e);
            } 
        }
    }

    dealOnePeople = async(id, task, item) => {
        let needDeal = await this.needDealPeople(item, id, task);
        if(needDeal)
            return;

        try {
            await this.profile.deal(id, task); 
        } catch (e) {
                logger.error(`linkedin ${this.userInfo.name} id: ${id} 处理简历异常: `, e);
        }

        if (this.profile.hiEnd)
            this.hiEnd = true;
    }

    reportPeople = async(id, task) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/report`,
            data: {
              accountID: this.userInfo.id,
              jobID: task.jobID,
              taskStatus: [{
                taskType: 'batchTouch',
                details: {
                  candidateList: [id]
                }
              }]
            },
            method: 'POST'
        });
    }

    dealOnePeopleBefore = async(item) => {
        let nameSpan = await item.$x(`//span[contains(@class, "entity-result__title-text")]//span[contains(@dir, "ltr")]//span[1]`);
        let name = await this.page.evaluate(node => node.innerText, nameSpan);
        await nameSpan.click();
        await this.waitElemet(`//main[contains(@class, "scaffold-layout__main")]`, this.page);
    }

    dealOnePeopleAfter = async(id, item) => {
        await this.page.goBack();
        await this.waitElement(`//div[contains(@class, "search-results-container")]`, this.page);
    }

    needDealPeople = async(item, id, task) => {
        let nameSpan = await item.$x(`//span[contains(@class, "entity-result__title-text")]//span[contains(@dir, "ltr")]//span[1]`);
        let name = await this.page.evaluate(node => node.innerText, nameSpan);

        if (name == "LinkedIn Member")
            return false;

        let distanceDegreeSpan = await item.$x(`//span[contains(@class, "entity-result__title-text")]//span[contains(@class, "entity-result__badge-text")]/span[contains(@class, "visually-hidden")]`);
        let distanceDegree = await this.page.evaluate(node => node.innerText, distanceDegreeSpan);
        if (distanceDegree.includes("1st"))
            return false;

        let cloudFlag = await this.needDealPeopleByCloud(id, task);
        if (!cloudFlag)
            return false;

        return true;
    }

    needDealPeopleByCloud = async(id, task) => {
        try {
            const { status, data } = await Request({
                url: `${BIZ_DOMAIN}/recruit/candidate/preFilter/v2`,
                data: {
                    accountID: this.userInfo.id,
                    jobID: task.jobID,
                    candidate_id: id
                },
                headers: {"Connection": "keep-alive"},
                method: 'POST'
            });
  
            logger.info(`linkedin ${this.userInfo.name} 数据库check ${id} ${status} ${data.touch} ` );
  
            if (status === 0 && data.touch) {
                return true;
            }
        } catch (e) {
            Logger.error(`linkedin ${this.userInfo.name}  数据库check 错误: `, e);
        }

        return false;
    }
}

module.exports = Resume;
const Base = require('./base');
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
        logger.info(`liepin ${this.userInfo.name} 打招呼，开始执行打招呼任务`);
        let tasks = await this.queryTasks();
        logger.info(`liepin ${this.userInfo.name} 获取到 ${tasks.length} 个打招呼任务, 任务如下: ${JSON.stringify(tasks)}`);

        this.hiEnd = false;
        for (let index in tasks) {
            if (this.hiEnd)
                break;

            let task = tasks[index];

            if (task.helloSum <= 0) {
                logger.info(`liepin ${this.userInfo.name} 任务 ${parseInt(index) + 1} 已经完成`);
                continue;
            }

            logger.info(`liepin ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个任务`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`liepin ${this.userInfo.name} 任务 ${parseInt(index) + 1} 出现异常失败: `, e)
            }
        }
    }

    dealTask = async(task) => {
        await this.dealTaskBefore(task);
        await this.noopTask(task);
        await this.refresh();
    }

    noopTask = async(task) => {
        let page = 1;
        while(true) {
            if (this.hiEnd)
                break;

            if (task.helloSum <= 0) {
                logger.info(`liepin ${this.userInfo.name} 今天的指标已经用完`);
                break;
            }

            logger.info(`liepin ${this.userInfo.name} 当前任务处理到第 ${page} 页 还剩 ${task.helloSum} 个打招呼`);
            await this.dealPeople(task);

            let hasNext = await this.nextPage();
            if (!hasNext)
                break;

            page += 1;
            if (!global.running)
                return;
        }
    }

    dealPeople = async(task) => {

    }

    dealOnePeople = async(id, httpUrl, task, item) => {

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

    needDealPeople = async(item, id, task) => {

    }

    needDealPeopleByCloud = async(id, task) => {
        return false;
    }
}

module.exports = Resume;
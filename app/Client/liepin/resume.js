const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const Search = require("./search");

const ExecuteHelper = require("../../Extension/execute");
const TabHelper = require("../../Extension/Tab");

class Resume extends Search {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }

    run = async () => {
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

    /**
     * 处理一个任务
     * @param {import('./base').Task} task 
     */
    dealTask = async (task) => {
        await this.dealTaskBefore(task); // 设置搜索条件并搜索
        await this.noopTask(task); // 处理这个任务
    }

    noopTask = async (task) => {
        let page = 1;
        while (true) {
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

    /**
     * 处理候选人列表
     * @param {import('./base').Task} task 
     */
    dealPeople = async (task) => {
        const peopleList = await this.waitElements(`//table[contains(@class, "new-resume-card")]//tbody//tr`, this.page);
        const itemsNum = peopleList.length;
        logger.info(`liepin ${this.userInfo.name} 搜索到 ${itemsNum} 个候选人 item`);

        if (peopleList.length) {
            /** @todo 猎聘有做埋点，每次点击事件会上报 */
            /** @todo 所以我们既要触发真实的点击操作，也要静默打开标签页 */

            for (let i = 0; i < itemsNum; i++) {
                let peopleItem = peopleList[i];
                await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), peopleItem); // 页面滚动到元素
                if (this.hiEnd) break;
                if (task.helloSum <= 0) {
                    logger.info(`liepin ${this.userInfo.name} 今天的指标已经用完`);
                    break;
                }

                // await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), peopleItem);
                logger.info(`liepin ${this.userInfo.name} 还剩 ${task.helloSum} 个招呼`);
                await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), peopleItem);
                try {
                    let { httpUrl } = await this.fetchPeopleUrl(peopleItem);
                    logger.info(`liepin ${this.userInfo.name} 当前处理people: ${httpUrl}`);
                    await this.dealOnePeople(httpUrl, task, peopleItem);
                } catch (e) {
                    logger.error(`liepin ${this.userInfo.name} dealOnePeople error: `, e);
                }
            }
        }


    }

    /**
     * 处理一个候选人
     * @param {string} httpUrl 
     * @param {import('./base').Task} task 
     * @param {import("puppeteer").ElementHandle<Node>} peopleItem 
     */
    dealOnePeople = async (httpUrl, task, peopleItem) => {
        const { status, tab, peopleInfo } = await ExecuteHelper.liepin.resume(httpUrl);
        if (status === "fail") {
            logger.info(`liepin ${this.userInfo.name} 获取候选人信息失败, 链接: ${httpUrl}`);
            return;
        }
        const id = peopleInfo.usercIdEncode || 0;
        logger.info(`liepin ${this.userInfo.name} 获取到简历: ${JSON.stringify(peopleInfo)}`);
        const f = await this.filterPeople(peopleInfo, task);
        if (f) return;

        const touchFlag = await this.touchPeople(tab, task);
        if (touchFlag) {
            await this.reportPeople(task, id);
            task.helloSum -= 1;
        }
        TabHelper.closeTab(tab.id);
    }

    /**
     * 筛选候选人信息
     * @param {any} peopleInfo 候选人信息 
     * @param {import('./base').Task} task 任务
     * @returns {Promise<boolean>} 是否已打招呼
     */
    filterPeople = async (peopleInfo, task) => {
        try {
            const { status, data } = await Request({
                url: `${BIZ_DOMAIN}/recruit/candidate/filter/v2`,
                data: {
                    accountID: this.userInfo.accountID,
                    jobID: task.jobID,
                    candidateInfo: peopleInfo
                },
                headers: { "Connection": "keep-alive" },
                method: 'POST'
            });

            logger.info(`liepin ${this.userInfo.name} 筛选结果 ${status} ${data.touch} `);

            if (status == 0 && data.touch) {
                return false;
            }
        } catch (e) {
            logger.error(`liepin ${this.userInfo.name} 筛选错误为##`, e);
        }

        return true;
    }

    /**
     * 进行打招呼任务
     * @param {import('../../Extension/Tab').Tab} tab 标签页
     * @param {import('./base').Task} task 任务
     * @returns {Promise<boolean>} 打招呼是否已成功
     */
    async touchPeople(tab, task) {
        let { status, error = "" } = await TabHelper.sendMessageToTab(tab.id, "liepin_profile_chat", "电商仓库管理员"); // 测试代码
        // let { status, error = "" } = await TabHelper.sendMessageToTab(tab.id, "liepin_profile_chat", task.job_name);
        logger.info(`liepin ${this.userInfo.name} 打招呼是否成功: ${status}, ${error ? error : ''}`);
        return status === "success";
    }

    reportPeople = async (id, task) => {
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
}

module.exports = Resume;
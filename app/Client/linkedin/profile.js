const Base = require('./Base');
const logger = require('../../Logger');
const { sleep } = require('../../utils');
const { BIZ_DOMAIN } = require("../../Config/index");
const Request = require('../../utils/Request');
const TabHelper = require("../../Extension/Tab");

const ExecuteHelper = require("../../Extension/execute");

class Profile extends Base {
    keywordDelay = 40;
    profile;
    tab;

    constructor(options) {
        super(options)
    }

    deal = async (id, httpUrl, task) => {
        logger.info(`linkedin ${this.userInfo.name} id: ${id} 开始处理简历: ${httpUrl}`);
        await this.dealBefore(httpUrl);
        let resume = await this.fetchResume();
        let filterFlag = await this.filterItem(resume, task, id);
        if (!filterFlag) {
            let touchFlag = await this.touchPeople(task, id, resume);
            if (touchFlag) {
                await this.reportPeople(id, task);
                task.helloSum -= 1;
                await sleep(60 * 1000);
            }
        }

        await this.dealEnd();
    }

    reportPeople = async (task, id) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/report/v2`,
            data: {
              accountID: this.userInfo.accountID,
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

    dealBefore = async (httpUrl) => {
        const tab = await TabHelper.createATab({
            url: httpUrl,
            active: false,
            selected: false,
        })
        this.tab = tab;
        await sleep(1 * 1000)
    }

    dealEnd = async () => {
        await TabHelper.closeTab(this.tab.id);
    }

    fetchResume = async (id) => {
        let resume = await TabHelper.sendMessageToTab(this.tab.id, "fetchResume", "");
        logger.info(`linkedin ${this.userInfo.name} id: ${id} resume: ${JSON.stringify(resume)}`);
        return resume;
    }

    filterItem = async (resume, task, id) => {
        try {
            const { status, data } = await Request({
                url: `${BIZ_DOMAIN}/recruit/candidate/filter`,
                data: {
                    accountID: this.userInfo.accountID,
                    jobID: task.jobID,
                    candidateInfo: resume
                },
                headers: { "Connection": "keep-alive" },
                method: 'POST'
            });

            logger.info(`linkedin ${this.userInfo.name} 筛选结果 ${id} ${status} ${data.touch} `);

            if (status === 0 && data.touch) {
                return false;
            }
        } catch (e) {
            logger.error(`linkedin ${this.userInfo.name} 筛选错误: `, e);
        }

        return true;
    }

    touchPeople = async (task, id) => {
        let r = await TabHelper.sendMessageToTab(this.tab.id, "linkedin_profile_chat", task.touch_msg);
        logger.info(`linkedin ${this.userInfo.name} id: ${id} touch r: ${r}`);
        return r;
    }
}

module.exports = Profile;
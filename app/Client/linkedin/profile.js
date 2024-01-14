const Base = require('./Base');
const logger = require('../../Logger');
const { sleep } = require('../../utils');
const { BIZ_DOMAIN } = require("../../Config/index");
const Request = require('../../utils/Request');

const ExecuteHelper = require("../../Extension/execute");

class Profile extends Base {
    keywordDelay = 40;
    profile;

    constructor(options) {
        super(options)
    }

    deal = async (id, task) => {
        logger.info(`linkedin ${this.userInfo.name} id: ${id} 开始处理简历`);
        let url = "https://www." + id;
        await this.fetchResume(url);
    }

    fetchResume = async (url) => {
        const { status, result } = await ExecuteHelper.Linkedin.resume(url);
        logger.info(`linkedin ${this.userInfo.name} id: ${id} status: ${status} result: ${result}`);
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

    touchPeople = async (task, id, peopleProfile) => {

    }
}

module.exports = Profile;
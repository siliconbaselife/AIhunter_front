const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

class Job extends Base {
    getJobs = async() => {
        logger.info(`boss ${this.userInfo.name} 获取发布岗位信息`);
        let jobInfos = [];
        try {
            await this.setBefore();
            jobInfos = await this.fetch();
            logger.info(`boss ${this.userInfo.name} 获取jobInfos: ${jobInfos}`);
            await this.setEnd();
        } catch(e) {
            logger.error(`boss ${this.userInfo.name} 任务  getJobs 失败: `, e)
        }
        return jobInfos;
    }

    setBefore = async() => {
        let [chatBtn] = await this.page.$x(`//dl[contains(@class, "menu-position")]`);
        await chatBtn.click();
        await sleep(500);

        const jobFrame = await this.page.$('#container iframe');
        this.frame = await jobFrame.contentFrame();

        await this.waitElement(`//div[contains(@class, "job-filter-container")]`, this.frame);

        let [openBtn] = await this.frame.$x(`//span[text() = "开放中"]`);
        await openBtn.click();
        await sleep(500);

        await this.waitElement(`//div[contains(@class, "data-tips")]`, this.frame);
    }

    setEnd = async() => {
        logger.info(`boss ${this.userInfo.name} 获取jobInfos成功`);
    }

    fetch = async() => {
        let jobInfos = [];

        let jobLists = await this.frame.$x(`//ul[contains(@class, "job-list-content")]/li`);
        for (let jobLi of jobLists) {
            let jobText = await jobLi.$x(`//div[contains(@class, "job-title")]/a`);
            let jobName = await this.frame.evaluate(node => node.innerText, jobText);
            jobInfos.push(jobName)
        }

        return jobInfos;
    }

}

module.exports = Job;
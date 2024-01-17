/** @typedef {{jobID: string, taskType: string, helloSum: number, filter: {search_text: string, hello_sum: number, education: string[], location: string[], industry: string[], ex_company: string[], sex: string, min_work_year: string, max_work_year: string}, touch_msg: string}} Task 单个任务 */

const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Search extends Base {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }

    run = async () => {
        logger.info(`liepin ${this.userInfo.name} 收集简历，开始执行任务`);
        let tasks = await this.queryTasks();
        logger.info(`liepin ${this.userInfo.name} 获取到 ${tasks.length} 个收集简历任务, 任务如下: ${JSON.stringify(tasks)}`);

        for (let index in tasks) {
            let task = tasks[index];

            logger.info(`liepin ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个收集简历任务`);

            try {
                console.log("")
            } catch (e) {
                logger.error(`liepin ${this.userInfo.name} 收集简历任务 ${parseInt(index) + 1} 出现异常失败: `, e)
            }
        }
    }

    /**
     * 获取任务列表
     * @returns {Task[]} 任务列表
     */
    queryTasks = async () => {
        const { status, data, msg } = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/fetch/v2`,
            data: {
                accountID: this.userInfo.accountID,
            },
            method: 'POST'
        });
        console.log("data", data);
        logger.info(`liepin ${this.userInfo.name} 领取到任务: ${JSON.stringify(data)}`);

        return data["task"];
    }

    /**
     * 进行开始任务前的设置操作
     * @param {Task} task 
     */
    dealTaskBefore = async (task) => {
        await this.switchSearchTab();
        await this.setSeachTxt(task);
        await this.setLocation(task);
        await this.setPastCompany(task);

    }

    async switchSearchTab() {
        const tabBtn = await this.waitElement(`//li[contains(@data-bar, "manager-search")]`);
        await tabBtn.click();
    }

    /**
     * 设置搜索内容
     * @param {Task} task 
     */
    async setSeachTxt(task) {
        const searchInput = await this.waitElement(`//div[contains(@class, "search-area")]//input[contains(@class, "ant-select-selection-search-input")]`, this.page)
        await searchInput.click();
        const searchTxt = task.filter.search_text;
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await sleep(500);
        await this.page.keyboard.press("Enter");
    }

    /**
     * 设置城市地区
     * @param {Task} task 
     */
    async setLocation(task) {
        const location = task.filter.location || [];
        if (location.length <= 0) return;
        // 期望城市行中的"其他"按钮
        const otherLocationBtn = await this.waitElement(`//div[contains(@class, "sfilter-city")][2]//span[contains(@class, "btn-choose")]`);
        await otherLocationBtn.click();

        // 弹窗
        const cityDialogXpath = `//div[contains(@class, "city-modal")]`;
        const cityFilterInput = await this.waitElement(`${cityDialogXpath}//div[contains(@class, "filter-box")]//input`, dialogDiv);
        for (let loc of location) {
            await cityFilterInput.click();
            await cityFilterInput.type(loc);
            await sleep(2000);

            const optionList = await this.waitElements(`${cityDialogXpath}//div[contains(@class, "filter-box")//div[contains(@class, "suggest-list")]//li]`, this.page, 4)
            console.log("optionList", optionList);
            if (optionList.length <= 0) {
                logger.info(`liepin ${this.userInfo.name} location: ${loc} 没有推荐list`);
                continue;
            }

            await optionList[0].click();
            await sleep(500);
        }

        const confirmBtn = await this.waitElement(`${cityDialogXpath}//div[contains(@class, "antd-lp-city-data-result")]//div[contains(@class, "result-btn")]//button`);
        await confirmBtn.click();
    }

    /**
     * 设置曾任职公司
     * @param {Task} task 
     */
    async setPastCompany(task){
        const ex_company = task.filter.ex_company || [];
        if (ex_company.length <= 0) return;
    }

    nextPage = async () => {
        await this.page.evaluate(() => {
            window.scrollTo({ top: 10000, left: 0, behavior: 'smooth' });
        });
        let nextBtn = await this.waitElement(`//button[contains(@aria-label, "Next") and not(contains(@class, "artdeco-button--disabled"))]`, this.page, 5);
        if (!nextBtn) {
            return false;
        }

        await nextBtn.click();
        await this.waitPeopleNum();

        return true;
    }

    fetchPeopleId = async (item) => {
        let [hrefDiv] = await item.$x(`//div[contains(@class, "entity-result__universal-image")]//a`);
        let httpUrl = await this.page.evaluate(node => node.href, hrefDiv);

        let httpUrltmp = httpUrl.split("?")[0];
        let id = httpUrltmp.replace("https://www.", "");

        return { id, httpUrl };
    }
}

module.exports = Search;
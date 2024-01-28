

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

    /**
     * 获取任务列表
     * @returns {import('./base').Task[]} 任务列表
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
        await this.setWorkYear(task);
        await this.setEducation(task);
        await this.setIndustry(task);
        await this.setSex(task);
        // await this.setAgeRange(task);
        await this.setDetaultOptions();
    }

    /**
     * 切换到"找人"tab
     */
    async switchSearchTab() {
        await this.page.goto(this.findPeopleUrl, { waitUntil: ["domcontentloaded", "networkidle0"] });
        await sleep(500);
    }

    /**
     * 设置搜索内容
     * @param {Task} task 
     */
    async setSeachTxt(task) {
        const searchInput = await this.waitElement(`//div[contains(@class, "search-area")]//div[contains(@class, "auto-input-wrap-v3")]//input[contains(@class, "ant-select-selection-search-input")]`, this.page)
        await searchInput.click();
        await sleep(500);
        const searchTxt = task.filter.search_text;
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await sleep(500);
        await this.page.keyboard.press("Enter");
        await sleep(2000);
    }

    /**
     * 设置城市地区
     * @param {Task} task 
     */
    async setLocation(task) {
        const location = task.filter.location || [];
        if (location.length <= 0) return;
        // 期望城市行中的"其他"按钮
        const otherLocationBtn = await this.waitElement(`//div[contains(@class, "sfilter-city")][2]//span[contains(@class, "btn-choose")]`, this.page);
        await otherLocationBtn.click();

        await sleep(1500);

        // 弹窗
        const cityDialogXpath = `//div[contains(@class, "city-modal")]`;
        const cityFilterInput = await this.waitElement(`${cityDialogXpath}//div[contains(@class, "filter-box")]//input`, this.page);
        for (let loc of location) {
            await cityFilterInput.click();
            await cityFilterInput.type(loc);
            await sleep(2000);

            const optionList = await this.waitElements(`${cityDialogXpath}//div[contains(@class, "filter-box")]//div[contains(@class, "suggest-list")]//li`, this.page, 10)
            // console.log("optionList", optionList);
            if (optionList.length <= 0) {
                logger.info(`liepin ${this.userInfo.name} location: ${loc} 没有推荐list`);
                continue;
            }

            await optionList[0].click();
            await sleep(1000);
        }

        const confirmBtn = await this.waitElement(`${cityDialogXpath}//div[contains(@class, "antd-lp-city-data-result")]//div[contains(@class, "result-btn")]//button[not(@disabled)]`, this.page);
        if (confirmBtn) await confirmBtn.click();
        else {
            logger.info(`liepin ${this.userInfo.name} location: 没有找到非disabled的确认按钮`);
            const closeBtn = await this.waitElement(`${cityDialogXpath}//span[contains(@class, "city-modal-close")]`, this.page);
            if (closeBtn) await closeBtn.click();
        }
    }

    /**
     * 设置工作年限
     * @param {Task} task 
     */
    async setWorkYear(task) {
        let { min_work_year = 0, max_work_year = 0 } = task.filter;
        min_work_year = Number(min_work_year);
        max_work_year = Number(max_work_year);
        if ((max_work_year < 0) || (min_work_year < 0) || (max_work_year <= min_work_year)) {
            logger.info(`liepin 工作年限设置有误, ${this.userInfo.name} 最大年限: ${max_work_year}, 最小年限: ${min_work_year}`);
            return;
        }

        // 工作年限行
        const workYearXpath = `//div[contains(@class, 'sfilter-work-year')]`;

        // "自定义"按钮
        const customEditBtn = await this.waitElement(`${workYearXpath}//label[text() = '自定义']`, this.page);
        await this.page.evaluateHandle((node) => {
            node.click();
        }, customEditBtn)

        await sleep(1000);

        // 最小年限输入框
        const minWorkYearInput = await this.waitElement(`${workYearXpath}//div[contains(@class, 'year-custom-box')]//input[contains(@id, "workYearsLow")]`, this.page);
        await minWorkYearInput.click();
        await this.page.keyboard.type(String(min_work_year), { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        // 最大年限输入框
        const maxWorkYearInput = await this.waitElement(`${workYearXpath}//div[contains(@class, 'year-custom-box')]//input[contains(@id, "workYearsHigh")]`, this.page);
        await maxWorkYearInput.click();
        await this.page.keyboard.type(String(max_work_year), { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });

        // 点击确定
        const clickResult = await this.page.evaluate(() => {
            const confirmBtn = document.querySelector(`.sfilter-work-year .year-custom-box button`);
            if (!confirmBtn) return false;
            confirmBtn.click();
            return true
        })
        if (!clickResult) logger.info(`liepin ${this.userInfo.name} 设置工作年限失败: 没有找到确认按钮`);

        await sleep(2000);
    }

    /**
     * 设置学历要求(教育经历)
     * @param {Task} task 
     */
    async setEducation(task) {
        const education = task.filter.education || [];
        if (education.length <= 0) return;

        // 教育经历行
        const eduXpath = `//div[contains(@class, 'sfilter-edu')]`;

        if (education.findIndex(edu => edu === "不限") !== -1) { // 如果存在"不限"条件，则直接点击"不限"
            const noLimitBtn = await this.waitElement(`${eduXpath}//div[contains(@class, 'tag-label-group')]//label[text() = "不限"]`, this.page, 4)
            await noLimitBtn.click();
        } else {
            for (let edu of education) {
                const eduBtn = await this.waitElement(`${eduXpath}//div[contains(@class, 'tag-label-group')]//label[text() = "${edu}"]`, this.page, 4);
                if (!eduBtn) {
                    logger.info(`liepin ${this.userInfo.name} education : ${edu} 没有找到对应的按钮`);
                    continue;
                }
                await eduBtn.click();
                await sleep(2 * 1000);
            }
        }
    }

    /**
     * 设置行业方向(当前行业)
     * @param {Task} task 
     */
    async setIndustry(task) {
        const industry = task.filter.industry || [];
        if (industry.length <= 0) return;

        // 当前行业
        const expectIndustryXpath = `//div[contains(@id, 'expect_industry')]`;
        const filterXpath = `//div[contains(@class, 'sfilter-industry')]`;

        // 打开弹窗的按钮
        const allBtn = await this.waitElement(`${expectIndustryXpath}${filterXpath}//div[contains(@class, 'antd-fd-industry-input-icon-wrapper')]`, this.page);
        await allBtn.click();
        await sleep(1000);

        // 弹窗
        const industryDialogXpath = `//div[contains(@class, "fe-industry-modal-wrapper")]`;
        const industryFilterInput = await this.waitElement(`${industryDialogXpath}//div[contains(@class, "antd-fd-industry-header-search-box")]//input`, this.page);
        for (let indus of industry) {
            await industryFilterInput.click();
            await industryFilterInput.type(indus);
            await sleep(2000);

            const optionList = await this.waitElements(`${industryDialogXpath}//div[contains(@class, "antd-fd-industry-header-search-box")]//div[contains(@class, "antd-fd-industry-modal-search-result")]//li`, this.page, 4)
            console.log("optionList", optionList);
            if (optionList.length <= 0) {
                logger.info(`liepin ${this.userInfo.name} industry: ${indus} 没有推荐list`);
                continue;
            }

            await optionList[0].click();
            await sleep(500);

            // 点击清除按钮
            const clearBtn = await this.waitElement(`${industryDialogXpath}//div[contains(@class, "antd-fd-industry-header-search-box")]//span[contains(@aria-label, "close-circle")]`, this.page);
            await clearBtn.click();
            await sleep(500);
        }

        const confirmBtn = await this.waitElement(`${industryDialogXpath}//div[contains(@class, "antd-fd-industry-data-result")]//div[contains(@class, "result-btn")]//button[not(@disabled)]`, this.page);
        if (confirmBtn) await confirmBtn.click();
        else {
            logger.info(`liepin ${this.userInfo.name} industry: 没有找到非disabled的确认按钮`);
            const closeBtn = await this.waitElement(`${industryDialogXpath}//span[contains(@class, "antd-fd-industry-modal-close")]`, this.page);
            if (closeBtn) await closeBtn.click();
        }

        await sleep(1000);
    }


    /**
     * 设置性别
     * @param {Task} task 
     */
    async setSex(task) {
        const sex = task.filter.sex || "不限";

        // 点击性别框
        await this.page.tap(`.sfilter-other-condition .search-item:nth-of-type(3) .search-item-cont`);

        // ant选择框
        const antSeleteXpath = `//div[contains(@class, "ant-select-dropdown")]`;
        // ant选择item
        const antSeleteItemXpath = `//div[contains(@class, "ant-select-item")]`;

        // 对应的选择item
        const sexSeleteItem = await this.waitElement(`${antSeleteXpath}${antSeleteItemXpath}//div[text() = "${sex}"]`, this.page, 4);

        if (sexSeleteItem) {
            await sexSeleteItem.click();
        } else {
            logger.info(`liepin 设置性别失败, ${this.userInfo.name} 没有找到确认按钮`);
        }

        await sleep(1000);
    }

    /**
     * 设置年龄范围
     * @param {Task} task 
     */
    async setAgeRange(task) {
        let { min_age = 0, max_age = 0 } = task.filter;
        min_age = Number(min_age); max_age = Number(max_age);
        if (min_age < 18 || max_age < 18 || max_age < min_age) {
            logger.info(`liepin 年龄范围设置有误, ${this.userInfo.name} 最大年龄: ${max_age}, 最小年龄: ${min_age}`);
            return;
        }

        // 其他行
        const otherRowXpath = `//div[contains(@class, "sfilter-other-condition")]`;
        // 年龄设置box
        const ageBoxXpath = `//div[contains(@class, "age-box")]`;

        // 最小年龄输入框
        const minAgeInput = await this.waitElement(`${otherRowXpath}${ageBoxXpath}//input[contains(@id, "ageLow")]`, this.page);
        // 最大年龄输入框
        const maxAgeInput = await this.waitElement(`${otherRowXpath}${ageBoxXpath}//input[contains(@id, "ageHigh")]`, this.page);

        await minAgeInput.click();
        await this.page.keyboard.type(String(min_age), { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await maxAgeInput.click();
        await this.page.keyboard.type(String(max_age), { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });

        // 点击确定
        const clickResult = await this.page.evaluate(() => {
            const confirmBtn = document.querySelector(`.sfilter-other-condition .age-box button`);
            if (!confirmBtn) return false;
            confirmBtn.click();
            return true
        })

        if (!clickResult) logger.info(`liepin ${this.userInfo.name} 设置年龄范围失败: 没有找到确认按钮`);
    }

    /**
     * 默认设置项
     */
    async setDetaultOptions() {
        const resultListBarXpath = `//div[contains(@class, "result-list-bar")]`;
        const leftSideXpath = `//div[contains(@class, "result-list-bar-left")]`;

        const hideAlreadyViewBtn = await this.waitElement(`${resultListBarXpath}${leftSideXpath}//label//span[text() = "隐藏已查看"]`, this.page, 4);
        hideAlreadyViewBtn ? await hideAlreadyViewBtn.click() : logger.info(`liepin 隐藏已查看 失败, ${this.userInfo.name} 没有找到按钮`);

        await sleep(1000);

        const hideAlreadyChatBtn = await this.waitElement(`${resultListBarXpath}${leftSideXpath}//label//span[text() = "隐藏已沟通"]`, this.page, 4);
        hideAlreadyChatBtn ? await hideAlreadyChatBtn.click() : logger.info(`liepin 隐藏已沟通 失败, ${this.userInfo.name} 没有找到按钮`);


    }

    nextPage = async () => {
        await this.page.evaluate(() => {
            window.scrollTo({ top: 10000, left: 0, behavior: 'smooth' });
        });
        let nextBtn = await this.waitElement(`//table[contains(@class, "new-resume-card")]//tfoot//li[contains(@class, "ant-pagination-next") and not (contains(@class, "disabled"))]`, this.page, 5);
        if (!nextBtn) {
            return false;
        }

        await nextBtn.click();
        await sleep(5 * 1000);

        return true;
    }


    /**
     * 获取候选人链接
     * @param {string | number} peopleId
     * @param {import("puppeteer").ElementHandle} peopleItem
     * @param {?number} maxTime 最大等待时间 
     * @returns {Promise<{httpUrl: string}>}
     */
    fetchPeopleUrl = async (peopleId, peopleItem, maxTime = 2000) => {
        sleep(2000).then(() => { peopleItem.click() });
        let httpUrl;
        try {
            httpUrl = await this.page.evaluate(async () => { // 劫持原生js跳转方法, 阻止页面默认的跳转行为, 并带回要跳转的url
                return new Promise((rs) => {
                    window.__origin_open = window.open;
                    window.open = (url) => {
                        window.open = window.__origin_open;
                        rs(url)
                    }
                })
            }).catch(err => {
                logger.error(`liepin ${this.userInfo.name} fetchPeopleUrl ${peopleId}  err ${err}`);
            })
        } catch (error) {
            logger.error(`liepin ${this.userInfo.name} fetchPeopleUrl ${peopleId} err ${error}`);
        }

        let waitTime = 0;
        while (!httpUrl && waitTime < maxTime) {
            await sleep(500);
            waitTime += 500;
        }

        if (!httpUrl) { // 如果通过以上方法还不能拿到链接，则手动拼接链接
            httpUrl = `https://h.liepin.com/resume/showresumedetail/?showsearchfeedback=1&res_id_encode=${peopleId}&position=3&cur_page=0&pageSize=30&sfrom=RES_SEARCH&res_source=1&type=normal`
        }

        logger.info(`liepin ${this.userInfo.name} fetchPeopleUrl, ${this.userInfo.name}, url: ${httpUrl}`);

        if (httpUrl) { // 对链接处理一下
            httpUrl = httpUrl.replace("JSHandle:", "");
            if (httpUrl.indexOf("https://h.liepin.com") === -1) httpUrl = "https://h.liepin.com" + httpUrl;
        }

        return { httpUrl };
    }
}

module.exports = Search;
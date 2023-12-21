const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const Logger = require('../../Logger');


class Resume extends Base {
    keywordDelay = 40;
    queryTasks = async() => {

    }

    run = async() => {
        Logger.info(`脉脉 ${this.userInfo.name} 打招呼，开始执行任务`);
        let tasks = await this.queryTasks();
        Logger.info(`脉脉 ${this.userInfo.name} 获取到 ${tasks.length} 个任务, 任务如下: ${tasks}`);

        for (let index in tasks) {
            let task = tasks[index];

            if (task.helloSum <= 0) {
                Logger.info(`脉脉 ${this.userInfo.name} 任务 ${index + 1} 已经完成`);
            }
    
            Logger.info(`脉脉 ${this.userInfo.name} 开始第 ${index + 1} 个任务`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`脉脉 ${this.userInfo.name} 任务 ${index + 1} 出现异常失败: `, e)
            }
        }
    }

    dealTask = async(task) => {
        await this.setFilter(task);
        await this.noopTask(task);
    }

    setFilter = async(task) => {
        await this.refresh();

        await this.setSearchTxt(task);
        await this.setLocation(task);
        await this.setEducation(task);
        await this.setWorkTime(task);
        await this.setIndustry(task);
        await this.setActiveInfo();
    }

    setActiveInfo = async() => {
        let checkBtn1 = await this.waitElement(`//span[text() = "近期未查看" and not(@disabled)]`);
        await this.page.evaluate((item)=>item.scrollIntoView(), checkBtn1);
        await checkBtn1.click();
        await this.waitPeopleNum();

        let checkBtn2 = await this.waitElement(`//span[text() = "近期未沟通" and not(@disabled)]`);
        await this.page.evaluate((item)=>item.scrollIntoView(), checkBtn2);
        await checkBtn2.click();
        await this.waitPeopleNum();
    }

    setIndustry = async(task) => {
        let industrys = task.filter.industry;
        if (!industrys || industrys.length)
            return

        let industrySpan = await this.waitElement(`//span[contains(@class, "title___2V3Fl") and text() = "行业方向"]`, this.page);
        await industrySpan.click();
        await sleep(200);

        for (let industry of industrys) {
            let [clearBtn] = await this.page.$x(`//div[contains(@class, "searchWrapper___eaY34")]//span[contains(@aria-label, "close-circle")]`);
            if (clearBtn)
                clearBtn.click();
            await sleep(200);

            let industryInput = await this.page.$x(`//input[contains(@class, "ant-input") and contains(@placeholder, "搜索行业方向")]`);
            await industryInput.click();
            await this.page.keyboard.type(industry, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
            await this.waitElement(`//div[contains(@class, "searchResultCard___2dROs")]`, this.page);

            let items = await this.page.$x(`//div[contains(@class, "searchResultItem___6ZslB")]`);
            if (items.length == 0)
                continue

            await items[0].click();
            await sleep(200);
        }

        let [sureBtn] = await this.page.$x(`//div[contains(@class, "mui-btn") and text() = "确 定"]`);
        await sureBtn.click();

        await this.waitPeopleNum();
    }

    setSearchTxt = async(task) => {
        let [inputText] = await this.waitElement(`//input[contains(@placeholder, "按职位/公司/学校/专业等条件搜索人才") and contains(@class, "ant-input")]`);
        await inputText.click();
        await sleep(300);

        let searchTxt = task.searchText;
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await this.page.keyboard.click('Shift');

        await this.waitPeopleNum();
    }

    setLocation = async(task) => {
        if (!task.filter.location || task.filter.location.length == 0)
            return;

        let cityBtn = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "城市地区"]`, this.page);
        await cityBtn.click();
        await sleep(300);

        await this.waitElement(`//div[contains(@class, "wrapper___3L7wg")]`);

        for (let location of task.filter.location) {
            let [clearBtn] = await this.page.$x(`//div[contains(@class, "search-input___287ix")]//span[contains(@aria-label, "close-circle")]`);
            if (clearBtn) {
                await clearBtn.click();
                await sleep(200);
            }

            let inputText = await this.waitElement(`//input[contains(@class, "ant-input") and contains(@placeholder, "请输入城市地区")]`, this.page);
            await inputText.type(location);
            await sleep(500);

            let selects = await this.page.$x(`//li[contains(@class, "option___nxmry")]`);
            if (selects.length > 0) {
                await selects[0].click();
            }
            await sleep(500);
        }

        await this.waitPeopleNum();
    }

    setEducation = async(task) => {
        let education = task.filter.education;
        if (!education)
            return;

        let [educationBtn] = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "学历要求"]`, this.page);
        await educationBtn.click();
        await sleep(500);

        let educationSpan = await this.waitElement(`//div[contains(@class, "content___6LPBl") and text() = "${education}"]`, this.page);
        if (educationSpan) {
            await educationSpan.click();
        }

        await this.waitPeopleNum();
    }

    setWorkTime = async(task) => {
        let beginTime = task.filter.min_work_year;
        let endTime = task.filter.max_work_year;
        if (!beginTime || !endTime)
            return;

        let [workTimeSpan] = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "工作年限"]`);
        await workTimeSpan.click();
        await sleep(500);

        await this.waitElement(`//div[contains(@class, "wrapper___3L7wg")]`);

        let [leftBtn] = await this.page.$x(`//span[contains(@class, "mui-select-selection-search")]/input[contains(@id, "rc_select_2")]`);
        await this.setWorkTimeDrop(leftBtn, beginTime);
        
        let [rightBtn] = await this.page.$x(`//span[contains(@class, "mui-select-selection-search")]/input[contains(@id, "rc_select_3")]`);
        await this.setWorkTimeDrop(rightBtn, endTime);

        let [sureBtn] = await this.page.$x(`//div[contains(@class, "mui-btn") and text() = "确定"]`);
        await sureBtn.click();
    
        await this.waitPeopleNum();
    }

    setWorkTimeDrop = async(btn, beginTime) => {
        await btn.click();
        let mainDiv = await this.waitElement('//div[contains(@class, "mui-select-dropdown-rtl") and not(contains(@class, "mui-select-dropdown-hidden"))]');

        let spanHeight = (3 + beginTime - 6) * 40;
        if (spanHeight > 0) {
            mainDiv.scrollTo(0, spanHeight);
        }
        await sleep(300);

        let beginTimeTxt = beginTime + "年";

        let [timeBtn] = await this.page.$x(`//div[contains(@class, "mui-select-item-option-content") and text() == "${beginTimeTxt}"]`);
        await timeBtn.click();
        await sleep(200);
    }

    waitPeopleNum = async() => {
        let [peopleNumSpan] = await this.page.$x('//div[contains(@class, "items-end")]/span[contains(@class, "white-space-nowrap")]');
        while(!peopleNumSpan) {
            await sleep(500);
            [peopleNumSpan] = await this.page.$x('//div[contains(@class, "items-end")]/span[contains(@class, "white-space-nowrap")]');
        }

        let txt = await this.page.evaluate(node => node.textContent, peopleNumSpan);
        Logger.info(`脉脉 ${this.userInfo.name} 搜集人数 ${txt}`);
    }

    refresh = async() => {
        let homeBtn = await this.waitElement('//div[contains(@class, "titleName___3TOJS") and text() = "首页"]', this.page);
        await homeBtn.click();
        await sleep(200);

        let recruiterBtn = await this.waitElement('//div[contains(@class, "titleName___3TOJS") and text() = "招人"]', this.page);
        await recruiterBtn.click();
        await sleep(200);

        let searchBtn = await this.waitElement(`//div[contains(@class, "tabContent___3rPz3") and text() = "搜索"]`, this.page);
        await searchBtn.click();
        await sleep(200);
    }

    noopTask = async(task) => {

    }

    waitElement = async(xpath, document, num = 10) => {
        let [element] = await document.$x(xpath);
        let time = 0;
        while(!element) {
            await sleep(500);
            [element] = await document.$x(xpath);
            time += 1;

            if (time > 10)
                return
        }

        return element;
    }
}
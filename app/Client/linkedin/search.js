const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Search extends Base {
    keywordDelay = 40;

    constructor(options) {
        super(options)
    }

    queryTasks = async() => {
        const {status, data, msg} = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/fetch/v2`,
            data: {
                accountID: this.userInfo.accountID,
            },
            method: 'POST'
          });
        logger.info(`linkedin ${this.userInfo.name} 领取到任务: ${JSON.stringify(data)}`);

        return data["task"];
    }

    dealTaskBefore = async(task) => {
        await this.refresh();
        await this.closeAllMsgDivs();
        await this.setSearchTxt(task);
        await this.setLocation(task);
        await this.setCurrentCompany(task);
        await this.setIndustry(task);
        await this.setPastCompany(task);
    }

    setSearchTxt = async(task) => {
        let searchInput = await this.waitElement(`//input[contains(@class, "search-global-typeahead__input")]`, this.page);
        await searchInput.click();
        let searchTxt = task.filter.search_text;
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await sleep(500);
        await this.page.keyboard.press('Enter');

        let peopleBtn = await this.waitElement(`//button[contains(@class, "search-reusables__filter-pill-button") and text() = "People"]`, this.page, 10 * 100);
        await peopleBtn.click();

        await this.waitPeopleNum();
    }

    waitPeopleNum = async() => {
        await this.waitElement(`//div[contains(@class, "search-results-container")]`, this.page);
    }

    setLocation = async(task) => {
        if (!task.filter.location || task.filter.location.length == 0)
            return;

        let locationBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "Locations"]`, this.page);
        await locationBtn.click();

        let mainDiv = await this.waitElement(`//div[contains(@class, "artdeco-hoverable-content--visible")]`, this.page);

        for (let location of task.filter.location) {
            await this.page.evaluate(() => {
                let input = document.querySelector(`.artdeco-hoverable-content--visible div.search-basic-typeahead > input`);
                if(!input)
                    return;
                
                input.value = "";
                const inputEvent = new Event("input", { bubbles: true });
                input.dispatchEvent(inputEvent);
            });

            let [locationInput] = await this.page.$x(`//input[contains(@placeholder, "Add a location")]`);
            await locationInput.click();
            await locationInput.type(location);
            await sleep(2000);
            
            let optionlist = await this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page, 4);
            console.log("optionlist: ", optionlist.length);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} location: ${location} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(500);
        }

        let [showBtn] = await mainDiv.$x(`//button[contains(@data-control-name, "filter_show_results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setIndustry = async(task) => {
        if (!task.filter.industry || task.filter.industry.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();
        await sleep(1000);

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [industryDiv] = await filtersDiv.$x(`//h3[text() = "Industry"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), industryDiv);
        await sleep(500);

        for (let industry of task.filter.industry) {
            let [addIndustryBtn] = await industryDiv.$x(`//span[text() = "Add an industry"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addIndustryBtn);
            await sleep(500);
            if (addIndustryBtn)
                await addIndustryBtn.click();

            let addIndustryInput = await this.waitElement(`//input[contains(@aria-label, "Add an industry")]`, industryDiv);

            await this.page.evaluate(() => {
                let input = document.querySelector(`.artdeco-modal-overlay .search-basic-typeahead > input`);
                if(!input)
                    return;
                
                input.value = "";
                const inputEvent = new Event("input", { bubbles: true });
                input.dispatchEvent(inputEvent);
            });

            await sleep(500);
            await addIndustryInput.type(industry);
            await sleep(2000);

            let optionlist = await this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page, 4);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} industry: ${industry} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(500);
        }

        let [showBtn] = await filtersDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setCurrentCompany = async(task) => {
        if (!task.filter.cur_company || task.filter.cur_company.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();
        await sleep(1000);

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [currentCompanyDiv] = await filtersDiv.$x(`//h3[text() = "Current company"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), currentCompanyDiv);
        await sleep(500);

        for (let company of task.filter.cur_company) {
            let [addcompanyBtn] = await currentCompanyDiv.$x(`//span[text() = "Add a company"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addcompanyBtn);
            await sleep(500);
            if (addcompanyBtn)
                await addcompanyBtn.click();

            let addcompanyInput = await this.waitElement(`//input[contains(@aria-label, "Add a company")]`, currentCompanyDiv);

            await this.page.evaluate(() => {
                let input = document.querySelector(`.artdeco-modal-overlay .search-basic-typeahead > input`);
                if(!input)
                    return;
                
                input.value = "";
                const inputEvent = new Event("input", { bubbles: true });
                input.dispatchEvent(inputEvent);
            });

            await sleep(500);
            await addcompanyInput.type(company);
            await sleep(2000);

            let optionlist = await this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page, 4);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} current company: ${company} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = await filtersDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setPastCompany = async(task) => {
        if (!task.filter.ex_company || task.filter.ex_company.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();
        await sleep(1000);

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [pastCompanyDiv] = await filtersDiv.$x(`//h3[text() = "Past company"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), pastCompanyDiv);

        for (let company of task.filter.ex_company) {
            let [addcompanyBtn] = await pastCompanyDiv.$x(`//span[text() = "Add a company"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addcompanyBtn);
            if (addcompanyBtn)
                await addcompanyBtn.click();

            let addcompanyInput = await this.waitElement(`//input[contains(@aria-label, "Add a company")]`, pastCompanyDiv);
            
            await this.page.evaluate(() => {
                let input = document.querySelector(`.artdeco-modal-overlay .search-basic-typeahead > input`);
                if(!input)
                    return;
                
                input.value = "";
                const inputEvent = new Event("input", { bubbles: true });
                input.dispatchEvent(inputEvent);
            });

            await sleep(500);
            await addcompanyInput.type(company);
            await sleep(2000);

            let optionlist = await this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page, 4);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} current company: ${company} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = await filtersDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    nextPage = async() => {
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

    fetchPeopleId = async(item) => {
        let [hrefDiv] = await item.$x(`//div[contains(@class, "entity-result__universal-image")]//a`);
        let httpUrl = await this.page.evaluate(node => node.href, hrefDiv);

        let httpUrltmp = httpUrl.split("?")[0];
        let id = httpUrltmp.replace("https://www.", "");

        return {id, httpUrl};
    }
}

module.exports = Search;
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
                accountID: this.userInfo.id,
            },
            method: 'POST'
          });
        logger.info(`linkedin ${this.userInfo.name} 领取到任务: ${JSON.stringify(data)}`);

        return data["task"];
    }

    dealTaskBefore = async() => {
        await this.refresh();
        await this.setSearchTxt(task);
        await this.setLocation(task);
        await this.setIndustry(task);
        await this.setCurrentCompany(task);
        await this.setPastCompany(task);
    }

    setSearchTxt = async(task) => {
        let searchInput = await this.waitElement(".search-global-typeahead__input", this.page);
        await searchInput.click();
        let searchTxt = task.filter.search_text;
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await this.page.keyboard.press('Enter');

        let peopleBtn = await this.waitElement(`//button[contains(@class, "search-reusables__filter-pill-button") and text() = "People"]`, this.page);
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

        let mainDiv = await this.waitElement(`//div[contains(@class, "artdeco-hoverable-content--visible")]`);

        for (let location of task.filter.location) {
            let [locationInput] = await this.page.$x(`//input[contains(@placeholder, "Add a location")]`);
            let text = await this.page.evaluate(node => node.textContent, locationInput);
            while(text.length > 0) {
                await locationInput.click({clickCount: 3});
                await sleep(500);
                await this.page.keyboard.press("Backspace");

                text = await this.page.evaluate(node => node.textContent, locationInput);
            }

            await locationInput.click();
            await locationInput.type(location);
            
            let optionlist = this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} location: ${location} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = mainDiv.$x(`//div[contains(@class, "artdeco-hoverable-content--visible")]//button[contains(@data-control-name, "filter_show_results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setIndustry = async() => {
        if (!task.filter.industry || task.filter.industry.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [industryDiv] = await filtersDiv.$x(`//h3[text() = "Industry"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), industryDiv);

        for (let industry of task.filter.industry) {
            let [addIndustryBtn] = await industryDiv.$x(`//span[text() = "Add an industry"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addIndustryBtn);
            if (addIndustryBtn)
                await addIndustryBtn.click();

            let addIndustryInput = await this.waitElement(`//input[contains(@aria-label, "Add an industry")]`, industryDiv);
            let txt = await this.page.evaluate(node => node.textContent, addIndustryInput);
            while(txt.length > 0) {
                await addIndustryInput.click({clickCount: 3});
                await sleep(500);
                await this.page.keyboard.press("Backspace");

                txt = await this.page.evaluate(node => node.textContent, addIndustryInput);
            }

            await addIndustryInput.type(industry);

            let optionlist = this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} industry: ${industry} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = filtersDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setCurrentCompany = async() => {
        if (!task.filter.cur_company || task.filter.cur_company.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [currentCompanyDiv] = await filtersDiv.$x(`//h3[text() = "Current company"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), currentCompanyDiv);

        for (let company of task.filter.cur_company) {
            let [addcompanyBtn] = await currentCompanyDiv.$x(`//span[text() = "Add an company"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addcompanyBtn);
            if (addcompanyBtn)
                await addcompanyBtn.click();

            let addcompanyInput = await this.waitElement(`//input[contains(@aria-label, "Add an company")]`, currentCompanyDiv);
            let txt = await this.page.evaluate(node => node.textContent, addcompanyInput);
            while(txt.length > 0) {
                await addcompanyInput.click({clickCount: 3});
                await sleep(500);
                await this.page.keyboard.press("Backspace");
    
                txt = await this.page.evaluate(node => node.textContent, addcompanyInput);
            }

            await addcompanyInput.type(company);

            let optionlist = this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} current company: ${company} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = mainDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }

    setPastCompany = async() => {
        if (!task.filter.past_company || task.filter.past_company.length == 0)
            return;

        let allBtn = await this.waitElement(`//button[contains(@class, "artdeco-pill") and text() = "All filters"]`, this.page);
        await allBtn.click();

        let filtersDiv = await this.waitElement(`//div[contains(@class, "search-reusables__side-panel--open")]`, this.page);
        let [pastCompanyDiv] = await filtersDiv.$x(`//h3[text() = "Past company"]/parent::*`);
        await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), pastCompanyDiv);

        for (let company of task.filter.past_company) {
            let [addcompanyBtn] = await pastCompanyDiv.$x(`//span[text() = "Add an company"]`);
            await filtersDiv.evaluate((item)=>item.scrollIntoView({ block: "center" }), addcompanyBtn);
            if (addcompanyBtn)
                await addcompanyBtn.click();

            let addcompanyInput = await this.waitElement(`//input[contains(@aria-label, "Add an company")]`, pastCompanyDiv);
            let txt = await this.page.evaluate(node => node.textContent, addcompanyInput);
            while(txt.length > 0) {
                await addcompanyInput.click({clickCount: 3});
                await sleep(500);
                await this.page.keyboard.press("Backspace");
    
                txt = await this.page.evaluate(node => node.textContent, addcompanyInput);
            }

            await addcompanyInput.type(company);

            let optionlist = this.waitElements('//div[contains(@class, "basic-typeahead__selectable")]', this.page);
            if (optionlist.length == 0) {
                logger.info(`linkedin ${this.userInfo.name} current company: ${company} 没有推荐list`);
                continue;
            }

            await optionlist[0].click();
            await sleep(1000);
        }

        let [showBtn] = mainDiv.$x(`//button[contains(@aria-label, "Apply current filters to show results")]`);
        await showBtn.click();

        await this.waitPeopleNum();
    }


    setFilter = async() => {
        await this.refresh();
    }

    nextPage = async() => {

    }

    fetchPeopleId = async(item) => {
        let hrefDiv = await item.$x(`//div[contains(@class, "entity-result__universal-image")]//a`);
        let httpUrl = await this.page.evaluate(node => node.href, hrefDiv);

        httpUrl = httpUrl.split("?")[0];
        let id = httpUrl.replace("https://www.", "");

        return id;
    }
}

module.exports = Search;
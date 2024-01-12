const Base = require('./Base');

class Profile extends Base {
    constructor(options) {
        super(options)
    }

    fetch = async() => {
        await this.waitElement(`//main[contains(@class, "scaffold-layout__main")]`, this.page);

        let resume = {}
        resume["profile"] = {}

        let contactInfo = await this.dealContactInfo();
        resume["profile"]["contactInfo"] = contactInfo
        resume["id"] = contactInfo["url"]

        let baseInfo = await this.dealBaseInfo();
        resume["profile"]["name"] = baseInfo["name"];
        resume["profile"]["location"] = baseInfo["location"];
        resume["profile"]["role"] = baseInfo["role"];
        resume["profile"]["summary"] = baseInfo["summary"];

        let experiences = await this.dealExperience();
        resume["profile"]["experiences"] = experiences;

        let educations = await this.dealEducation();
        resume["profile"]["educations"] = educations;

        let languages = await this.dealLanguages();
        resume["profile"]["languages"] = languages;

        return resume;
    }

    dealContactInfo = async() => {
        let contactInfoBtn = await this.waitElement(`//a[text() = "Contact info"]`, this.page);
        await contactInfoBtn.click();

        await this.waitElement(`//div[contains(@aria-labelledby, "pv-contact-info")]`, this.page);
        let contactInfo = {};
        let contactSections = await this.page.$x(`//section[contains(@class, "pv-contact-info__contact-type")]`);
        for (let index in contactSections) {
            let contactSection = contactSections[index];
            let keySpan;
            if (index == 0) {
                keySpan = await contactSection.$x(`//h3[contains(@class, "pv-contact-info__header")]`);
            } else {
                keySpan = await contactSection.$x(`//div[contains(@class, "pv-contact-info__header")]`);
            }
            let key = await this.page.evaluate(node => node.innerText, keySpan);

            let valueSpan = await contactSection.$x(`//div[contains(@class, "pv-contact-info__ci-container")]`);
            let value = await this.page.evaluate(node => node.innerText, valueSpan);

            contactInfo[key] = value;
        }

        await this.page.goback();
        await sleep(500);

        return contactInfo;
    }

    dealBaseInfo = async() => {
        let baseInfo = {};
        let cardSection = await this.waitElement(`//main[contains(@class, "scaffold-layout__main")]/section[contains(@class, "artdeco-card")][1]`, this.page);

        let [nameSpan] = await cardSection.$x(`//span[contains(@class, "artdeco-hoverable-trigger")]/a/h1`);
        baseInfo["name"] = await this.page.evaluate(node => node.innerText, nameSpan);

        let [localtionSpan] = await cardSection.$x(`//div[contains(@class, "mt2")]/div[contains(@class, "mt2")]/span[contains(@class, "inline")]`);
        baseInfo["location"] = await this.page.evaluate(node => node.innerText, localtionSpan);

        let [roleSpan] = await cardSection.$x(`//div[contains(@class, "mt2")]/div[not(contains(@class, "mt2"))]/div[contains(@class, "text-body-medium break-words")]`);
        baseInfo["role"] = await this.page.evaluate(node => node.innerText, roleSpan);

        let summaryDiv = await this.waitElement(`//span[text() = "About"][1]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*//div[contains(@class, "inline-show-more-text")]//span[1]`, this.page);
        baseInfo["summary"] = await this.page.evaluate(node => node.innerText, summaryDiv);

        return contactInfo;
    }

    dealExperience = async() => {
        let experiences = []
        let [experienceDiv] = await this.page.$x(`//span[text() = "Experience"][1]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*`);
        if (experienceDiv)
            return experiences;

        let lis = await experienceDiv.$x(`//li[contains(@class, "artdeco-list__item")]`);
        for (let li of lis) {
            let circles = await li.$x(`//span[contains(@class, "pvs-entity__path-node")]`);
            let experience;
            if (circles.length > 0) {
                experience = await this.fetchExperienceFirst(li);
            } else {
                experience = await this.fetchExperienceSecond(li);
            }

            if (experience) {
                experiences.push(experience);
            }
        }

        return experiences;
    }

    fetchExperienceFirst = async(experienceLi) => {
        let experience = {
            "companyName": null,
            "timeInfo": null,
        };

        let [companyNameSpan] = await experienceLi.$x(`//a[contains(@data-field, "experience_company_logo")]//div[contains(@class, "mr1")]/span[contains(@class, "visually-hidden")]`);
        if (companyNameSpan)
            experience["companyName"] = await this.page.evaluate(node => node.innerText, companyNameSpan);

        let [companyTimeSpan] = experienceLi.$x('//a[contains(@data-field, "experience_company_logo")]//span[contains(@class, "t-14") and not(contains(@class, "t-black--light"))]//span[contains(@class, "visually-hidden")]');
        if (companyTimeSpan)
            experience["timeInfo"] = await this.page.evaluate(node => node.innerText, companyTimeSpan);

        experience["works"] = [];
        let workSpans = await experienceLi.$x('/div/div[2]/div[2]/ul/li');
        for (let workSpan of workSpans) {
            let workDiv = workSpan.parentElement;
            let workInfo = await this.dealCompanyExperienceWork(workDiv);
            experience["works"].push(workInfo);
        }
    
        return experience;
    }

    dealCompanyExperienceWork = async(workDiv) => {
        let work = {};
        let [workPositionSpan] = await workDiv.$x(`//div[contains(@class, "mr1")]/span[contains(@class, "visually-hidden")]`);
        if (workPositionSpan)
            work["workPosition"] = await this.page.evaluate(node => node.innerText, workPositionSpan);

        let [TimeInfoSpan] = workDiv.$x(`//a/span[contains(@class, "t-14")]/span[contains(@class, "pvs-entity__caption-wrapper")]`);
        if (TimeInfoSpan)
            work["workTimeInfo"] = await this.page.evaluate(node => node.innerText, TimeInfoSpan);

        let [workLocationSpan] = workDiv.$x(`//a/span[contains(@class, "t-black--light")]/span[contains(@aria-hidden, "true") and not(contains(@class, "pvs-entity__caption-wrapper"))]`);
        if (workLocationSpan)
            work["workLocationInfo"] = await this.page.evaluate(node => node.innerText, workLocationSpan);

        let workDescriptionSpan = await this.page.evaluate(`//div[contains(@class, "inline-show-more-text")]/span[contains(@class, "visually-hidden")]`);
        if (workDescriptionSpan)
            work["workDescription"] = await this.page.evaluate(node => node.innerText, workDescriptionSpan);

        return work;
    }

    fetchExperienceSecond = async(experienceLi) => {
        let experience = {
            "companyName": null,
            "timeInfo": null,
            "work": [{}]};
        let [companyNameSpan] = await experienceLi.$x(`//span[contains(@class, "t-14 t-normal") and not(contains(@class, "t-black--light"))]/span[contains(@class, "visually-hidden")]`);
        if (companyNameSpan)
            experience["companyName"] = await this.page.evaluate(node => node.innerText, companyNameSpan);

        let [timeInfoSpan] = await experienceLi.$x(`//span[contains(@class, "t-14 t-normal") and contains(@class, "t-black--light")]/span[contains(@class, "pvs-entity__caption-wrapper")]`);
        if (timeInfoSpan) {
            let timeInfo = await this.page.evaluate(node => node.innerText, timeInfoSpan);
            experience["timeInfo"] = timeInfo;
            experience["work"][0]["workTimeInfo"] = timeInfo;
        }

        let [locationSpan] = await experienceLi.$x(`//span[contains(@class, "t-14 t-normal") and not(contains(@class, "t-black--light"))]/span[not(contains(@class, "visually-hidden"))]`);
        if (locationSpan)
            experience["work"][0]["worklocation"] = await this.page.evaluate(node => node.innerText, locationSpan);

        let [workPositionSpan] = await experienceLi.$x(`//div[contains(@class, "mr1")]//span[contains(@class, "visually-hidden")]`);
        if (workPositionSpan)
            experience["work"][0]["workPosition"] = await this.page.evaluate(node => node.innerText, workPositionSpan);

        let [workDescriptionSpan] = await experienceLi.$x(`//div[contains(@class, "inline-show-more-text")]//span[contains(@class, "visually-hidden")]`);
        if (workDescriptionSpan)
            experience["work"][0]["workDescription"] = await this.page.evaluate(node => node.innerText, workDescriptionSpan);

        return experience;
    }

    dealEducation = async() => {
        let educations = [];
        let educationSection = await this.page.$x(`//span[text() = "Education"][1]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*`);
        if (!educationSection)
            return educations;

        let educationLis = await educationSection.$x(`//li[contains(@class, "artdeco-list__item")]/span[contains(@class, "visually-hidden")]`);
        for (let educationLi of educationLis) {
            let education = {};
            let [schoolNameSpan] = await educationLi.$x(`//div[contains(@class, "mr1")]/span[contains(@class, "visually-hidden")]`);
            if (schoolNameSpan)
                education["schoolName"] = await this.page.evaluate(node => node.innerText, schoolNameSpan);

            let [schoolmajorInfoSpan] = await educationLi.$x(`//span[contains(@class, "t-14 t-normal") and not(contains(@class, "t-black--light"))]/span[contains(@class, "visually-hidden")]`);
            if (schoolmajorInfoSpan)
                education["majorInfo"] = await this.page.evaluate(node => node.innerText, schoolmajorInfoSpan);

            let [timeSpan] = await educationLi.$x(`//span[contains(@class, "t-14") and contains(@class, "t-black--light")]/span[contains(@class, "visually-hidden")]`);
            if (timeSpan)
                schoolInfo["timeInfo"] = await this.page.evaluate(node => node.innerText, timeSpan);

            let schoolsummarySpan = await educationLi.$x(`//div[contains(@class, "mv1")]//span[contains(@class, "visually-hidden")]`);
            if (schoolsummarySpan)
                schoolInfo["summary"] = await this.page.evaluate(node => node.innerText, schoolsummarySpan);
            educations.push(education);
        }

        return educations;
    }

    dealLanguages = async() => {
        let languages = [];

        let [languageSection] = await this.page.$x(`//span[text() = "Languages" and contains(@class, "visually-hidden")]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*`);
        if (!languageSection)
            return languages;

        let [showBtn] = await languageSection.$x(`//a[contains(@id, navigation-index-see-all-languages)]`);
        if (showBtn) {
            languages = await this.dealLanguagesFirst(languageSection, showMoreBtn);
        } else {
            languages = await this.dealLanguagesSecond(languageSection);
        }

        return languages;
    }

    dealLanguagesFirst = async(showMoreBtn) => {
        let languages = []
         await showMoreBtn.click();
         await this.waitElement(`//main[contains(@class, "scaffold-layout__main")]/section/div[contains(@class, "ph3")]/div/h2[text() = "Languages"]`, this.page);
         let mainDiv = await this.waitElement(`//main[contains(@class, "scaffold-layout__main")]`);
         let lis = mainDiv.$x(`//li`);
         for (let li of lis) {
            let [languageNameSpan] = await li.$x(`//div[contains(@class, "mr1")]/span[contains(@class, "visually-hidden")]`);
            let languageName = await this.page.evaluate(node => node.innerText, languageNameSpan);
            language["language"] = languageName;
            let [languageCapacitySpan] = await li.$x(`//span[contains(@class, "pvs-entity__caption-wrapper")]`);
            if (languageCapacitySpan)
                language["des"] = await this.page.evaluate(node => node.innerText, languageNameSpan);
            languages.push(language);
         }

         await this.page.goback();
         await sleep(500);

         await this.waitElement(`//main[contains(@class, "scaffold-layout__main")]`);
         
         return languages;
    }

    dealLanguagesSecond = async(languageSection) => {
        let languages = []
        let lis = await languageSection.$x(`//li`);
        for (let li of lis) {
            let language = {}
            let [languageNameSpan] = await li.$x(`//div[contains(@class, "mr1")]/span[contains(@class, "visually-hidden")]`);
            let languageName = await this.page.evaluate(node => node.innerText, languageNameSpan);
            language["language"] = languageName;
            let [languageCapacitySpan] = await li.$x(`//span[contains(@class, "pvs-entity__caption-wrapper")]`);
            if (languageCapacitySpan)
                language["des"] = await this.page.evaluate(node => node.innerText, languageNameSpan);

            languages.push(language);
        }

        return languages;
    }
}

module.exports = Profile;
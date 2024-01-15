module.exports =
`
class Resume extends Base {
    static getInstance() {
        if (!Resume.instance) Resume.instance = new Resume();
            return Resume.instance;
    }

    EVENT_TYPE = "fetchResume";

    initialize() {
        console.log("Linkedin Resume inited");
        ContentMessageHelper.getInstance().listenFromOthers(this.EVENT_TYPE, this.handleGotTabParams.bind(this));
    }

    async handleGotTabParams(keyword) {
        console.log("receive resume begin");
        let resume = await this.dealOneResume();
        console.log("receive resume end");
        return resume;
    }

    async dealOneResume() {
        console.log("dealOneResume start");
        let resume = { "profile": {} };

        let contactInfo = await this.dealContactInfo();
        resume["profile"]["contactInfo"] = contactInfo
        resume["id"] = contactInfo["url"]
        console.log("dealContactInfo end");

        let baseInfo = await this.dealBaseInfo();
        console.log("baseInfo: ", JSON.stringify(baseInfo));
        resume["profile"]["name"] = baseInfo["name"];
        resume["profile"]["location"] = baseInfo["location"];
        resume["profile"]["role"] = baseInfo["role"];
        resume["profile"]["summary"] = baseInfo["summary"];
        console.log("dealBaseInfo end");

        let experiences = await this.dealExperience();
        resume["profile"]["experiences"] = experiences;
        console.log("dealExperience end");

        let educations = await this.dealEducation();
        resume["profile"]["educations"] = educations;
        console.log("dealEducation end");

        let languages = await this.dealLanguages();
        resume["profile"]["languages"] = languages;
        console.log("dealLanguages end");

        console.log("resume: ", JSON.stringify(resume));

        return resume
    }

    async dealLanguages() {
        let languages = [];
        let languageElement = await fetchElementByText("h2.pvs-header__title > span.visually-hidden", "Languages");
        if (!languageElement) {
            return languages;
        }
        await languageElement.scrollIntoView(false);

        let mainElement = languageElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
        let showMoreBtn = mainElement.querySelector('#navigation-index-see-all-languages');
        if (showMoreBtn) {
            languages = await this.dealLanguagesFirst(showMoreBtn);
        } else {
            languages = await this.dealLanguagesSecond(mainElement);
        }

        return languages;
    }

    async dealLanguagesFirst(showMoreBtn) {
        let languages = [];
        await showMoreBtn.scrollIntoView(false);
        await showMoreBtn.click();

        let element = await waitElement(".scaffold-finite-scroll__content");
        if (!element)
            return languages;

        let languageLis = document.querySelectorAll(".pvs-entity--padded");
        for (let languageLi of languageLis) {
            let language = {};

            let languageNameSpan = languageLi.querySelector(".mr1 > .visually-hidden");
            if (languageNameSpan)
                language["language"] = languageNameSpan.innerText;

            let languagedesSpan = languageLi.querySelector(".t-black--light > .visually-hidden");
            if (languagedesSpan)
                language["des"] = languagedesSpan.innerText;

            languages.push(language);
        }

        await history.back();

        return languages;
    }

    async dealLanguagesSecond(mainElement) {
        let languages = [];
        let languageLis = mainElement.querySelectorAll(".pvs-entity--padded");
        for (let languageLi of languageLis) {
            let language = {};
            let languageNameSpan = languageLi.querySelectorAll(".flex-column")[0];
            if (languageNameSpan)
                language["language"] = languageNameSpan.innerText

            let languagedesSpan = languageLi.querySelectorAll(".flex-column")[1];
            if (languagedesSpan)
                language["des"] = languagedesSpan.innerText

            languages.push(language);
        }

        return languages;
    }

    async dealEducation() {
        let educations = []
        let educationElement = await fetchElementByText("h2.pvs-header__title > span.visually-hidden", "Education");
        if (!educationElement) {
            return educations;
        }

        let mainElement = educationElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
        let schoolDivs = mainElement.querySelectorAll("li.artdeco-list__item");
        for (let schoolDiv of schoolDivs) {
            let schoolInfo = {}
            let schoolNameSpan = schoolDiv.querySelector('a > div.align-items-center > div > div > div > .visually-hidden');
            if (schoolNameSpan)
                schoolInfo["schoolName"] = schoolNameSpan.innerText;

            let schoolmajorInfoSpan = schoolDiv.querySelectorAll('a > span.t-14 > .visually-hidden')[0];
            if (schoolmajorInfoSpan)
                schoolInfo["majorInfo"] = schoolmajorInfoSpan.innerText

            let schooltimeInfoSpan = schoolDiv.querySelectorAll('a > span.t-14 > .visually-hidden')[1];
            if (schooltimeInfoSpan)
                schoolInfo["timeInfo"] = schooltimeInfoSpan.innerText

            educations.push(schoolInfo);
        }

        return educations
    }

    async dealBaseInfo() {
        let baseInfo = {
        }

        let nameDiv = await document.querySelector(".ph5 > .mt2 > div:nth-child(1) > div:nth-child(1) > span:nth-child(1) > a > h1");
        if (nameDiv)
            baseInfo["name"] = nameDiv.innerText;

        let locationDiv = await document.querySelector(".ph5 > .mt2 > div.mt2 > span:nth-child(1)");
        if (locationDiv)
            baseInfo["location"] = locationDiv.innerText;

        let roleDiv = await document.querySelector(".ph5 > .mt2 > div:nth-child(1) > div.text-body-medium");
        if (roleDiv)
            baseInfo["role"] = roleDiv.innerText;

        let aboutElement = await fetchElementByText("h2.pvs-header__title > span.visually-hidden", "About");
        if (aboutElement) {
            let aboutMainDiv = aboutElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
            let summaryDiv = aboutMainDiv.querySelector(".ph5").querySelector(".visually-hidden");
            baseInfo["summary"] = summaryDiv.innerText;
        }

        return baseInfo;
    }

    async dealExperience() {
        let experienceElement = await fetchElementByText("h2.pvs-header__title > span.visually-hidden", "Experience");
        let experiences = []
        if (!experienceElement) {
            return experiences;
        }

        let mainElement = experienceElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
        let companyExperienceElements = mainElement.querySelectorAll(".artdeco-list__item");
        for (let companyExperienceElement of companyExperienceElements) {
            let experienceTitles = companyExperienceElement.querySelectorAll("li > .pvs-entity__path-node");
            let experience;
            if (experienceTitles.length > 0) {
                experience = await this.dealCompanyExperienceFirst(companyExperienceElement);
            } else {
                experience = await this.dealCompanyExperienceSecond(companyExperienceElement);
            }
            experiences.push(experience);
        }

        return experiences;
    }

    async dealCompanyExperienceFirst(companyExperienceElement) {
        let experience = {
            "companyName": null,
            "timeInfo": null,
        };

        let companyNameSpan = companyExperienceElement.querySelectorAll(".mr1 > .visually-hidden")[0];
        if (companyNameSpan)
            experience["companyName"] = companyNameSpan.innerText;

        let companyTimeSpan = companyExperienceElement.querySelectorAll('a[data-field="experience_company_logo"] > span > .visually-hidden')[0];
        if (companyTimeSpan)
            experience["timeInfo"] = companyTimeSpan.innerText;

        experience["works"] = [];
        let workSpans = companyExperienceElement.querySelectorAll('li > span.pvs-entity__path-node');
        for (let workSpan of workSpans) {
            let workDiv = workSpan.parentElement;
            let workInfo = await this.dealCompanyExperienceWork(workDiv);
            experience["works"].push(workInfo);
        }

        return experience;
    }

    async dealCompanyExperienceWork(workDiv) {
        let work = {};
        let workPositionSpan = workDiv.querySelector(".mr1 > .visually-hidden");
        if (workPositionSpan)
            work["workPosition"] = workPositionSpan.innerText;

        let TimeInfoSpan = workDiv.querySelector('a > span > .visually-hidden')
        if (TimeInfoSpan)
            work["workTimeInfo"] = TimeInfoSpan.innerText;

        let workLocationSpan = workDiv.querySelectorAll('a > span')[1];
        if (workLocationSpan) {
            workLocationSpan = workLocationSpan.querySelector('.visually-hidden');
            work["workLocationInfo"] = workLocationSpan.innerText;
        }

        let workDescriptionSpan = workDiv.querySelector('li.pvs-list__item--with-top-padding > div > div > div > div > .visually-hidden');
        if (workDescriptionSpan)
            work["workDescription"] = workDescriptionSpan.innerText;

        return work;
    }

    async dealCompanyExperienceSecond(companyExperienceElement) {
        let experience = {
            "companyName": null,
            "timeInfo": null,
            "work": [
                {

                }
            ]
        };

        let companyNameSpan = companyExperienceElement.querySelectorAll('div[data-view-name="profile-component-entity"] > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span.t-14 > .visually-hidden')[0];
        if (companyNameSpan)
            experience["companyName"] = companyNameSpan.innerText;

        let timeInfoSpan = companyExperienceElement.querySelectorAll('div[data-view-name="profile-component-entity"] > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span.t-black--light > .visually-hidden')[0];
        if (timeInfoSpan) {
            experience["timeInfo"] = timeInfoSpan.innerText
            experience["work"][0]["workTimeInfo"] = timeInfoSpan.innerText
        }

        let locationSpan = companyExperienceElement.querySelectorAll('div[data-view-name="profile-component-entity"] > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > span.t-black--light > .visually-hidden')[1];
        if (locationSpan)
            experience["work"][0]["worklocation"] = locationSpan.innerText

        let workPositionSpan = companyExperienceElement.querySelector('.mr1 > .visually-hidden')
        if (workPositionSpan)
            experience["work"][0]["workPosition"] = workPositionSpan.innerText

        let workDescriptionSpan = companyExperienceElement.querySelector("li.pvs-list__item--with-top-padding > div > div > div > div > .visually-hidden")
        if (workDescriptionSpan)
            experience["work"][0]["workDescription"] = workDescriptionSpan.innerText

        return experience;
    }

    async dealContactInfo() {
        let contactInfoBtn = await waitElement("#top-card-text-details-contact-info", 10);
        if (!contactInfoBtn) {
            console.log("contact info 按钮没有找到");
            return;
        }
        await contactInfoBtn.click();

        let contactDiv = await waitElement(".text-body-large-open", 10);
        if (!contactDiv) {
            console.log("contactDiv 未出现");
            return;
        }

        let contactInfo = {}
        let keyDivs = await document.querySelectorAll('.pv-contact-info__header');
        let valueDivs = document.querySelectorAll('.pv-contact-info__ci-container')
        console.log("keyDivs: ", keyDivs.length, "valueDivs: ", valueDivs.length);
        for (let i in keyDivs) {
            let key = keyDivs[i].innerText;
            let value = valueDivs[i].innerText;
            if (i == 0)
                contactInfo["url"] = value

            contactInfo[key] = value;
        }

        await history.back();
        await sleep(200);

        return contactInfo;
    }
}
`
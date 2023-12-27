class Profile extends Base {
    constructor(options) {
        super(options)
    }

    fetch = async() => {
        let resume = {}
        resume["profile"] = {}

        let contactInfo = await this.dealContactInfo();
        resume["profile"]["contactInfo"] = contactInfo
        resume["id"] = contactInfo["url"]

        let baseInfo = await this.dealBaseInfo();
        console.log("baseInfo: ", JSON.stringify(baseInfo));
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
        let contactInfoBtn = await waitElement(`//a[text() = "Contact info"]`, this.page);
        await contactInfoBtn.click();

        let contactDiv = await waitElement(".text-body-large-open", 10);
    }

    dealBaseInfo = async() => {

    }

    dealExperience = async() => {

    }

    dealEducation = async() => {

    }

    dealLanguages = async() => {

    }
}

module.exports = Profile;
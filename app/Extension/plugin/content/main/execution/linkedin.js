module.exports =
    `
/** 总控制器 ------------------------------------------------------------------------------------------------------------------ */
class LinkedinExecutor {
    static instance = new LinkedinExecutor();
    static getInstance() {
        if (!LinkedinExecutor.instance) LinkedinExecutor.instance = new LinkedinExecutor();
        return LinkedinExecutor.instance;
    }
    constructor() {
        this.initialize();
    };

    // linkedinEnterprise = LinkedinEnterprise.getInstance();
    linkedinPerson = LinkedinPerson.getInstance();
    linkedinChat = LinkedinChat.getInstance();

    initialize() {
        this.linkedinPerson.initialize();
        // this.linkedinEnterprise.initialize();
        this.linkedinChat.initialize();
    }
}

/** 总控制器 end ------------------------------------------------------------------------------------------------------------------ */
`
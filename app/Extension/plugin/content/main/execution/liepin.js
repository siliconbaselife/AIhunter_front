module.exports =
    `
/** 总控制器 ------------------------------------------------------------------------------------------------------------------ */
class LiePinExecutor {
    static instance = new LiePinExecutor();
    static getInstance() {
        if (!LiePinExecutor.instance) LiePinExecutor.instance = new LiePinExecutor();
        return LiePinExecutor.instance;
    }
    constructor() {
        this.initialize();
    };

    CMH = ContentMessageHelper.getInstance();


    liePinProfile = LiePinProfile.getInstance(); 

    initialize() {
        this.liePinProfile.initialize();
    }
}

/** 总控制器 end ------------------------------------------------------------------------------------------------------------------ */
`
module.exports = 
`
class LinkedinChat extends Base {
    static instance = new LinkedinChat();
    static getInstance() {
        if (!LinkedinChat.instance) LinkedinChat.instance = new LinkedinChat();
        return LinkedinChat.instance;
    }

    EDIT_BTN_NAME = "编辑候选人";

    INACTIVE_BTN_NAME = "开始";
    ACTIVE_BTN_NAME = "停止";

    LINKEDIN_PROFILE_CHAT_TYPE = "linkedin_profile_chat"; // 领英详情页打招呼类型

    /**
     * 初始化
     */
    initialize() {
        // 查看当前标签页的参数，如果有参数，则直接开启任务
        TabHelper.getInstance().getCurrentTabParams().then((args) => this.handleGotTabParams.apply(this, args));
        console.log("initialized");
    }

    /** 1. 本页是profile页, 自动开始对某一个人打招呼 ------------------------------------------------------------------------------------------------------------------------------------- */
    CANDIDATE_NAME_EL_SELECTOR = "a.pv-text-details__about-this-profile-entrypoint h1"; // 候选人名字标签选择器
    OUTSIDE_CONNECT_BTN_SELECTOR = ".pv-top-card-v2-ctas button[aria-label $= connect]"; // 外层Connect按钮选择器
    MORE_BTN_SELECTOR = ".artdeco-card button[aria-label = 'More actions']"; // More按钮选择器
    INSIDE_CONNECT_BTN_SELECTOR = ".artdeco-card .artdeco-dropdown div[aria-label $= connect]"; //里层Connect按钮选择器

    DIALOG_ADD_A_NOTE_BTN_SELECTOR = ".artdeco-modal button[aria-label = 'Add a note']"; // 弹窗里的Add a Note 按钮选择器
    DIALOG_TEXTAERA_SELECTOR = ".artdeco-modal textarea#custom-message"; // 弹窗里的 长文本输入框 选择器
    DIALOG_SEND_BTN_SELECTOR = ".artdeco-modal button[aria-label $= 'Send now']"; // 弹窗里的Send 按钮选择器

    /**
     * 读取进来参数, 给本页的一个人打招呼
     * @param {string} type 进来类型
     * @param {string} chatTemplate 消息模板 
     */
    async handleGotTabParams(type, chatTemplate) {
        console.log(type, chatTemplate);
        this.chatTemplate = chatTemplate;
        if (type === this.LINKEDIN_PROFILE_CHAT_TYPE) { // 是自动打招呼类型
            try {
                // 先寻找一下候选人名称
                const candidateNameH1 = await waitElement(this.CANDIDATE_NAME_EL_SELECTOR, 10);
                const candidateName = candidateNameH1.innerText;
                console.log("当前正在给 " + candidateName + "打招呼");

                // 寻找并点击Connect按钮
                const connectBtnEl = await this.findConnectBtnEl();
                if (!connectBtnEl) {
                    console.log("没有connect按钮");
                    TabHelper.getInstance().markExecuteStatus("fail", "没有connect按钮");
                    return;
                }

                await connectBtnEl.click();
                await waitElement(".send-invite", 10);

                // 输入文本
                if (this.chatTemplate) { // 如果有模板消息, 则先输入内容再发送
                    // 点击add a note
                    const addANoteBtnEl = await waitElement(this.DIALOG_ADD_A_NOTE_BTN_SELECTOR, 5);
                    addANoteBtnEl.click();
                    await sleep(500);
                    // 寻找长文本输入框，并输入文本
                    const textareaEl = await waitElement(this.DIALOG_TEXTAERA_SELECTOR, 5);
                    fillTextOnInputOrTextarea(textareaEl, "Hi, " + candidateName + ", " + this.chatTemplate);
                    await sleep(500);
                }
                // 点击Send按钮
                const sendBtnEl = await waitElement(this.DIALOG_SEND_BTN_SELECTOR, 5);
                await sendBtnEl.click();
                // 标记已成功
                TabHelper.getInstance().markExecuteStatus("success");
            } catch (error) {
                // 标记失败，带去错误信息
                console.log("给当前人员打招呼失败", error);
                TabHelper.getInstance().markExecuteStatus("fail", error);
                // 叫background上传记录 // 暂时不用报告失败情况
            }
        }
    }

    /**
     * 寻找Connect按钮元素
     * @returns {Promise<HTMLButtonElement | HTMLDivElement>} Connect按钮元素
     */
    async findConnectBtnEl() {
        let el = await waitElement(this.OUTSIDE_CONNECT_BTN_SELECTOR, 4);
        console.log("el:", el);
        if (!el) {
            console.log("找不到外层Connect按钮");
            let moreBtnEl = await waitElement(this.MORE_BTN_SELECTOR, 10);
            if (!moreBtnEl) {
                return Promise.reject("找不到更多按钮");
            } else {
                await moreBtnEl.click()
            }
        }
        if (!el) {
            await waitElement(".artdeco-dropdown__content--is-open", 10);
            el = await document.querySelector(this.INSIDE_CONNECT_BTN_SELECTOR);
        }
        return el;
    }

    /** 本页是profile页, 自动开始对某一个人打招呼 end ------------------------------------------------------------------------------------------------------------------------------------- */
}
`
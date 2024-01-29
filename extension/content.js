
        
// 共享公共方法
/**
 * uuid
 * @param {number} len 
 * @param {number} radix 
 * @returns {string}
 */
const uuid = (len, radix) => {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        let r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

/**
 * 简单的异步调用
 * @param {Function} cb 
 * @param {boolean} ignoreError
 */
const asyncCall = (cb, ignoreError = false) => {
    let timer = setTimeout(() => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (ignoreError) { try { cb(); } catch { } }
        else cb();
    }, 0);
}

/**
 * 加载动画样式库
 */
const loadAnimateCss = () => {
    try {
        const linkEl = document.createElement("link");
        linkEl.href = chrome.runtime.getURL("assets/animate/animate.css");
        linkEl.rel = "stylesheet";
        document.head.appendChild(linkEl);
    } catch (error) {
        console.log("加载样式库失败,如果环境没有DOM,可忽略", error);
    }
}

/**
 * 等待完成
 * @param {() => boolean} cb 回调
 * @param { number } interval 间隔ms
 * @param { number } maxTime 最大等待时间
 * @returns { Promise<void> }
 */
const waitCondition = async (cb, interval = 500, maxTime = 10000) => {
    let success = cb();
    if (success) return Promise.resolve();
    else if (maxTime <= 0) return Promise.reject("等待超时");
    return new Promise((rs) => {
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                timer = null
            }
            maxTime -= interval;
            rs(waitCondition(cb, interval, maxTime))
        }, interval);
    })
}

/**
 * 等待x毫秒
 * @param {number} time 等待时间 
 * @returns {Promise<void>}
 */
const sleep = async (time = 500) => {
    return new Promise(rs => {
        let timer = setTimeout(() => {
            if (timer) {
                clearTimeout(timer);
                timer = null
            }
            rs()
        }, time)
    })
}

/**
 * Blob转文件
 * @param {Blob} blob blob
 * @param {string} filename 文件名称
 * @param {FilePropertyBag} options 其他选项
 * @returns {Promise<File>}
 */
const blobToFile = async (blob, filename, options) => {
    return new File([blob], filename, options)
}


        
class ContentMessageHelper {
    static instance = new ContentMessageHelper();
    static getInstance() {
        if (!ContentMessageHelper.instance) ContentMessageHelper.instance = new ContentMessageHelper();
        return ContentMessageHelper.instance;
    }
    constructor() {
        // 监听来自inject的消息
        window.addEventListener("message", (e) => {
            // 处理来自Inject的消息
            const data = e.data || {};
            const { type, message } = data;
            const cbObj = this.injectMap[type] || {};
            Object.keys(cbObj).forEach(key => {
                let cb = cbObj[key];
                if (typeof cb === "function") {
                    asyncCall(() => cb(message));
                }
            })

            // 另外也通知下 扩展页面（options_page,bakcground,popup
            this.callFromContent(type, message).catch(() => { })
        })

        // 监听来自others的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // 处理来自others的消息
            let isAsync = false;
            const eventName = request && request.eventName;
            const cb = this.map[eventName];
            let responseMessage = cb && cb(request.message, sender);
            if (responseMessage instanceof Promise) {
                responseMessage.then(message => {
                    sendResponse(message)
                })
                isAsync = true;
            } else {
                sendResponse(responseMessage);
            }

            return isAsync;
        })
    }

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 ---------------------------------------------------------------- */

    map = {};
    /**
     * 发送事件
     * 从内容脚本(content_scripts) 发送到 扩展页面（options_page,bakcground,popup）
     * @param {string} eventName 
     * @param {any} message
     * @returns {Promise<any>}
     */
    async callFromContent(eventName, message) {
        return chrome.runtime.sendMessage({
            eventName,
            message
        });
    }

    /**
     * 监听事件
     * 接收 扩展页面（options_page,bakcground,popup）发送的事件
     * @param {string} eventName
     * @param {(request: {message: any}, sender) => any} handler 
     * @returns {string}
     */
    listenFromOthers(eventName, handler) {
        if (eventName && handler) {
            this.map[eventName] = handler;
        }
    }

    /**
     * 卸载监听
     * @param {string} eventName
     * @returns {void} 
     */
    unlistenEvent(eventName) {
        if (eventName && this[eventName]) {
            delete this.map[eventName]
        }
    }

    /**
     * 卸载所有监听
     */
    unListenAll() {
        this.map = {};
    }

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 end ---------------------------------------------------------------- */

    /** 内容脚本(content_scripts) 和 扩张页面options_page,bakcground,popup）通信 end ---------------------------------------------------------------- */




    /** 内容脚本(content_scripts) 和 被注入页面 通信 ----------------------------------------------------------------------------------------------- */
    injectMap = {};

    /**
     * 监听从Inject发送的消息
     * @param {string} eventName
     * @param {({request: {url: string, method: string, headers: {[{key: string}] : string}, body: any }, response: any}) => void} handler
     * @returns { string | undefined }
     */
    listenFromInject(eventName, handler) {
        if (eventName && handler) {
            const id = uuid(8, 16);
            this.injectMap[eventName] = this.injectMap[eventName] || {};
            this.injectMap[eventName][id] = handler;
            return id;
        }
    }

    /**
     * 卸载对Inject的监听
     * @param {string} eventName 
     * @param {string | undefined | null} id 
     * @returns 
     */
    unlistenFromInject(eventName, id) {
        const cbObj = this.injectMap[eventName];
        if (!cbObj) return;
        if (!id) {
            delete this.injectMap[eventName];
        } else if (cbObj[id]) {
            delete cbObj[id]
        }
    }

    /**
     * 卸载所有Inject的监听
     */
    unListenAllFromInject() {
        this.injectMap = {};
    }

    /** 内容脚本(content_scripts) 和 被注入页面 通信 end ----------------------------------------------------------------------------------------------- */

}

ContentMessageHelper.getInstance();

        
/**
 * 持续获取element
 * @returns {Promise<HTMLElement>}
 */
const waitElement = async (elementName, maxNum = 10, rootElement = document) => {
    let element = await rootElement.querySelector(elementName);
    let waitNum = 0;
    while (!element && maxNum != 1) {
        console.log(waitNum + "网太慢了，element还没有刷新出来" + elementName);
        await sleep(1000);

        waitNum += 1;
        if (waitNum > maxNum)
            return;
        element = await rootElement.querySelector(elementName);
    }

    return element;
}

/**
 * 持续获取elements
 * @param {string} elementName
 * @param {HTMLElement} rootElement
 * @returns {Promise<NodeList>}
 */
const waitElements = async (elementName, rootElement = document, maxNum = 10) => {
    let element = rootElement.querySelectorAll(elementName);
    let waitNum = 0;
    while (!element && maxNum != 1) {
        console.log(waitNum + "网太慢了，element还没有刷新出来" + elementName);
        await sleep(1000);

        waitNum += 1;
        if (waitNum > maxNum)
            return;
        element = rootElement.querySelectorAll(elementName);
    }

    return element;
}

/**
 * 根据内容获取element
 */
const fetchElementByText = async (elementName, text) => {
    let elements = await document.querySelectorAll(elementName);
    if (elements.length == 0)
        return

    let rElement = Array.from(elements).find(el => el.textContent === text);
    return rElement;
}

/**
 * 根据内容获取element的element
 */
const fetchElementByTextInElement = async (mainElement, elementName, text) => {
    let elements = await mainElement.querySelectorAll(elementName);
    if (elements.length == 0)
        return

    for (let element of elements) {
        if (element.innerText === text)
            return element;
    }

    return
}

/**
 * 在文本框或长文本框中输入文字，并触发元素的input方法
 * @param {HTMLInputElement | HTMLTextAreaElement} element 
 * @param {string} text 
 */
const fillTextOnInputOrTextarea = (element, text) => {
    element.value = text;
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
}

/**
 * 关闭当前标签页
 */
const closeCurrentTab = () => {
    try {
        window.opener = window;
        var win = window.open("", "_self");
        win.close();
        //frame的时候
        top.close();
    } catch { }
}


/**
 * 阻止原页面打开新标签
 */
const preventPageOpenNewTab = () => {
    ContentMessageHelper.getInstance().callFromContentToInject(Constants.PREVENT_PAGE_OPEN_NEW_TAB_EVENT_TYPE);
}

/**
 * 恢复原页面打开新标签
 */
const recoverPageOpenNewTab = () => {
    ContentMessageHelper.getInstance().callFromContentToInject(Constants.RECOVER_PAGE_OPEN_NEW_TAB_EVENT_TYPE);
}

/**
 * 下载链接, 下载并得到为Blob
 * @param {string} url 文件链接
 * @param {string} filename 文件名称
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
const urlToBlob = async (url, filename) => {
    const { xhr, response: blob } = await requestByXhr(url, "GET", undefined, undefined, "blob");
    if (!filename) {
        console.log("blob", blob);
        let contentDisposition = xhr.getResponseHeader("content-disposition") || "";
        let filenameRegex = /filename[^;=\n]*=((['"]).*?{\2}|[^;\n]*)/;
        let matches = filenameRegex.exec(contentDisposition);
        if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    return { blob, filename };
}

/**
 * 自动匀速滚动
 * @param {number} gap 间隔px(数值越高越快)
 * @param {HTMLElement} parentElement 父元素
 * @param {number} targetTop 目标scrollTop
 */
const intervalScroll = async (gap = 50, parentElement = document.documentElement, targetTop) => {
    return new Promise(rs => {
        const scroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = parentElement;
            if (scrollHeight <= clientHeight) return;
            targetTop = targetTop || scrollHeight;
            if (scrollTop + clientHeight === scrollHeight) {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                rs();
            } else {
                parentElement.scrollTo({ left: 0, top: scrollTop + gap, behavior: 'smooth' });
            }
        }
        let timer = setInterval(scroll, 100);
    })
}

        
class TabHelper {
    /** @private */
    static instance = new TabHelper();
    /**
     * 获取实例(单例)
     * @returns {TabHelper}
     */
    static getInstance() {
        if (!TabHelper.instance) TabHelper.instance = new TabHelper();
        return TabHelper.instance;
    }

    /**
     * 获取当前标签页的参数
     * @returns {Promise<IArguments>}
     */
    async getCurrentTabParams() {
        let params;
        await waitCondition(() => {
            let paramsJson = document && document.body && document.body.dataset && document.body.dataset["__sipk"];
            try {
                if (paramsJson) {
                    let paramsObj = JSON.parse(paramsJson);
                    params = Object.keys(paramsObj).map(key => paramsObj[key]);
                }
            } catch { }
            if (params) return true;
        }, 500, 10 * 1000); // (最多等10秒)
        return params;
    }

    /**
     * 标记已成功或者失败, 并返回标记信息给(打开这个新标签的父页面)
     * @param {"success" | "fail"} status 状态
     * @param {any} payload 标记信息
     */
    async markExecuteStatus(status, payload) {
        document.body.dataset["__sisk"] = JSON.stringify({
            status,
            payload
        });
        await sleep(1000); // 等1秒，让那边检测到变化，通知父页面
    }
}

TabHelper.getInstance();

        
class Base {

};

        
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
        ContentMessageHelper.getInstance().listenFromOthers(this.LINKEDIN_PROFILE_CHAT_TYPE, this.handleGotTabParams.bind(this));
        console.log("LinkedinChat initialized");
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
    async handleGotTabParams(chatTemplate) {
        this.chatTemplate = chatTemplate;
        console.log("chatTemplate: ", chatTemplate);
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
            return true;
        } catch (error) {
            // 标记失败，带去错误信息
            console.log("给当前人员打招呼失败", error);
            // 叫background上传记录 // 暂时不用报告失败情况
            return false;
        }
    }

    /**
     * 寻找Connect按钮元素
     * @returns {Promise<HTMLButtonElement | HTMLDivElement>} Connect按钮元素
     */
    async findConnectBtnEl() {
        let el = await waitElement(this.OUTSIDE_CONNECT_BTN_SELECTOR, 3);
        console.log("el:", el);
        if (!el) {
            console.log("找不到外层Connect按钮");
            let moreBtnEl = await waitElement(this.MORE_BTN_SELECTOR, 3);
            if (!moreBtnEl) {
                return Promise.reject("找不到更多按钮");
            } else {
                await moreBtnEl.click()
            }
        }
        if (!el) {
            await waitElement(".artdeco-dropdown__content--is-open", 3);
            el = await document.querySelector(this.INSIDE_CONNECT_BTN_SELECTOR);
        }
        return el;
    }

    /** 本页是profile页, 自动开始对某一个人打招呼 end ------------------------------------------------------------------------------------------------------------------------------------- */
}

        
class LinkedinPerson extends Base {
    static instance = new LinkedinPerson();
    static getInstance() {
        if (!LinkedinPerson.instance) LinkedinPerson.instance = new LinkedinPerson();
        return LinkedinPerson.instance;
    }

    LINKEDIN_PROFILE_FETCH = "linkedin_profile_fetch"

    /**
     * 初始化
     */
    initialize() {
        console.log("LinkedinPerson inited");
        TabHelper.getInstance().getCurrentTabParams().then((args) => this.dealTabProfile.apply(this, args));
    }

    async dealTabProfile(type) {
        console.log("dealTabProfile type", type);
        if (type === this.LINKEDIN_PROFILE_FETCH) {
            try {
                let resume = await this.dealOneResume();
                TabHelper.getInstance().markExecuteStatus("success", [resume]);
                console.log("成功处理完简历");
            } catch (error) {
                // 标记失败，带去错误信息
                TabHelper.getInstance().markExecuteStatus("fail", error);
                console.log("获取当前profile失败: ", error);
            }
        }
    }

    /** 2. 定向打招呼，获取数据，并对特定人群进行打招呼 end ------------------------------------------------------------------------- */

    async dealResumeError() {
        let personDivs = document.querySelectorAll(".reusable-search__result-container");
        while (personDivs.length == 0) {
            await history.back();
            await sleep(3000);
        }
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
    resume = Resume.getInstance();

    initialize() {
        this.linkedinPerson.initialize();
        // this.linkedinEnterprise.initialize();
        this.linkedinChat.initialize();
        this.resume.initialize();
    }
}

/** 总控制器 end ------------------------------------------------------------------------------------------------------------------ */

        
    class LiePinProfile extends Base {
        static instance = new LiePinProfile();
        static getInstance() {
            if (!LiePinProfile.instance) LiePinProfile.instance = new LiePinProfile();
            return LiePinProfile.instance;
        }

        LIEPIN_PROFILE_CHAT = "liepin_profile_chat";

        LIEPIN_PROFILE_SEARCH = "liepin_profile_search";

        /**
         * 初始化
         */
        initialize() {
            console.log("LiePinProfile inited");
            // 监听打招呼事件，帮忙收集简历
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_PROFILE_SEARCH, this.handleLiePinProfileSearch.bind(this));
            // 监听打招呼事件，帮忙打招呼
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_PROFILE_CHAT, this.handleLiePinProfileChat.bind(this));
        }

        /**
         * 打招呼
         * @param {string} job_name 岗位名称
         * @returns {Promise<{status: "success" | "fail", error: any}>} 打招呼消息
         */
        async handleLiePinProfileChat(job_name) {
            try {
                console.log("liepin_profile_chat");

                /** @todo 这里进行打招呼操作 */
                /** @todo 完成后返回true */

                // 立即沟通按钮
                let chatBtn = await waitElement(".resume-detail-operation-wrap .chat-btn");
                chatBtn.click();

                await sleep(1000);

                let dialogEl = await waitElement(".hpublic-message-select-box-auto", 1, document).catch(err => {
                    console.log("点击立即沟通按钮后没有弹出弹窗，认为是打招呼成功了", err);
                    return true;
                })
                if (dialogEl === true) return { status: "success", error: null };

                // 打招呼语第一个选项按钮
                let firstChatTemaplteBtn = await waitElement(".hpublic-message-select-box-auto .li-item:nth-of-type(1)");

                firstChatTemaplteBtn.click();

                // 打开岗位选择
                let jobSelectInput = await waitElement(".hpublic-job-select input#jobId");
                let mouseDownEvent = new Event("mousedown", {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    button: 1
                });
                jobSelectInput.dispatchEvent(mouseDownEvent);

                await sleep(1000);

                // 选择岗位
                let jobOptions = await waitElements(".hpublic-job-and-msg-modal-cont-new .ant-form-item-control .ant-select-item-option");
                let targetOptionEl;
                if (jobOptions && jobOptions.length) {
                    for (let optionEl of jobOptions) {
                        let textEl = optionEl.querySelector("strong");
                        if (textEl && textEl.innerText && textEl.innerText.indexOf(job_name) !== -1) { // 匹配岗位名
                            targetOptionEl = optionEl;
                            break;
                        }
                    }
                }

                if (!targetOptionEl) return { status: "fail", error: "打招呼失败, 没有匹配到对应的岗位:" + job_name }
                targetOptionEl.click();

                await sleep(1000);

                // 点击立即开聊按钮
                let submitBtn = await waitElement(".hpublic-job-and-msg-modal-cont-new .btn-bar .btn-ok");
                submitBtn.click();

                await sleep(1000);

                // 标记已成功
                return { status: "success" };
            } catch (error) {
                // 标记失败，带去错误信息
                console.log("给当前人员打招呼失败", error);
                // 叫background上传记录 // 暂时不用报告失败情况
                return { status: "fail", error }
            }
        }

        /**
         * 收集简历
         * @returns {Promise<{status: "success" | "fail", peopleInfo: any, error: any}>} 收集简历结果
         */
        async handleLiePinProfileSearch() {
            try {
                console.log("liepin_profile_search start")

                let errorMsg = "";
                await waitElement(".c-resume-body-cont");
                let basicInfo = await this.getBasicInfo().catch(err => { errorMsg += (err && err.message || ""); return null });
                let jobExpectancies = await this.getJobExpectancy().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let workExperiences = await this.getWorkExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let projectExperiences = await this.getProjectExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let eduExperiences = await this.getEduExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let languages = await this.getlanguages().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let skills = await this.getSkills().catch(err => { errorMsg += (err && err.message || ""); return [] });
                let selfEvaInfo = await this.getSelfEvaInfo().catch(err => { errorMsg += (err && err.message || ""); return "" });
                let additionalInfo = await this.getAdditionalInfo().catch(err => { errorMsg += (err && err.message || ""); return "" });

                let peopleInfo = this.gatherAllInfo({
                    basicInfo,
                    jobExpectancies,
                    workExperiences,
                    projectExperiences,
                    eduExperiences,
                    languages,
                    skills,
                    selfEvaInfo,
                    additionalInfo
                })
                return { status: "success", peopleInfo, error: errorMsg }
            } catch (error) {
                console.log("error", error);
                return { status: "fail", error }
            }
        }


        async getBasicInfo() {
            let baseInfoEl = await waitElement("#resume-detail-basic-info", 1);

            if (baseInfoEl) {
                let nameEl = await waitElement(".name-box .name", 1, baseInfoEl);
                let name = nameEl && nameEl.innerText;
                let statusEl = await waitElement(".user-status-tag", 1, baseInfoEl);
                let status = statusEl && statusEl.innerText;
                let baseRowEls = await waitElements(".basic-cont .sep-info", baseInfoEl, 1);
                let [baseRowEl1, baseRowEl2] = baseRowEls;
                let [sex, age, district, degree, workyear, salary] = baseRowEl1.innerHTML.split("<i></i>");
                let [current_job_name, current_company_name] = baseRowEl2.innerHTML.split("<i></i>");
                return {
                    name,
                    status,
                    sex,
                    age,
                    district,
                    degree,
                    workyear,
                    salary,
                    current_job_name,
                    current_company_name
                }
            } else {
                return null;
            }
        }

        async getJobExpectancy() {
            let jobExpectancyEl = await waitElement("#resume-detail-job-exp-info", 1);
            let result = [];
            if (jobExpectancyEl) {
                let oneRow = await waitElement(".left-wrap", 1, jobExpectancyEl);
                let jobExpectancyNameEl = await waitElement(".title", 1, oneRow);
                let jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                let jobExpectancySalaryEl = await waitElement(".salary", 1, oneRow);
                let jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                let jobExpectancyDistrictEl = await waitElement(".dqname", 1, oneRow);
                let jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                let jobExpectancyLabelContainerEl = await waitElement(".lebels-wrap", 1, oneRow);
                let jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl, 1);
                let jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);

                result.push({
                    jobExpectancyName,
                    jobExpectancySalary,
                    jobExpectancyDistrict,
                    jobExpectancyLabels
                })

                // 暂不需要所有的求职期望数据
                // let viewAllBtn = await waitElement(".want-job .job-card-right", 1, jobExpectancyEl);
                // if (!viewAllBtn) { // 没有查看全部按钮
                //     let oneRow = await waitElement(".left-wrap", 1, jobExpectancyEl);
                //     let jobExpectancyNameEl = await waitElement(".title", 1, oneRow);
                //     let jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                //     let jobExpectancySalaryEl = await waitElement(".salary", 1, oneRow);
                //     let jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                //     let jobExpectancyDistrictEl = await waitElement(".dqname", 1, oneRow);
                //     let jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                //     let jobExpectancyLabelContainerEl = await waitElement(".lebels-wrap", 1, oneRow);
                //     let jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl);
                //     let jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);

                //     result.push({
                //         jobExpectancyName,
                //         jobExpectancySalary,
                //         jobExpectancyDistrict,
                //         jobExpectancyLabels
                //     })
                // } else { // 有查看全部按钮
                //     viewAllBtn.click();
                //     await sleep(500);
                //     let dialogEl = await waitElement(".want-job-list-modal", 5);
                //     let wantJobEls = (await waitElements(".want-job-list .job-card-left", dialogEl)) || [];
                //     for (let wantJobEl of wantJobEls) {
                //         let jobExpectancyNameEl = await waitElement(".job-name", 1, wantJobEl);
                //         let jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                //         let jobExpectancySalaryEl = await waitElement(".salary", 1, wantJobEl);
                //         let jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                //         let jobExpectancyDistrictEl = await waitElement(".address", 1, wantJobEl);
                //         let jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                //         let jobExpectancyLabelContainerEl = await waitElement(".industry-name", 1, wantJobEl);
                //         let jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl);
                //         let jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);
                //         result.push({
                //             jobExpectancyName,
                //             jobExpectancySalary,
                //             jobExpectancyDistrict,
                //             jobExpectancyLabels
                //         })
                //     }
                //     let closeBtnEl = await waitElement(".ant-modal-close", 1, dialogEl);
                //     if (closeBtnEl) closeBtnEl.click();
                // }
            }

            return result;
        }

        async getWorkExperiences() {
            let workExperiencesEl = await waitElement("#resume-detail-work-info", 1);
            let result = [];
            if (workExperiencesEl) {
                let workExperienceEls = (await waitElements(".resume-detail-template-cont", workExperiencesEl, 1)) || [];


                for (let workExperienceEl of workExperienceEls) {
                    let workInCompanyEl = await waitElement(".rd-info-tpl-item-head .rd-work-comp>h5", 1, workExperienceEl);
                    let workInCompany = workInCompanyEl && workInCompanyEl.innerText;
                    let workInCompanyTimeEl = await waitElement(".rd-info-tpl-item-head .rd-work-time", 1, workExperienceEl);
                    let workInCompanyTime = workInCompanyTimeEl && workInCompanyTimeEl.innerText;

                    let workInCompanyTagEls = await waitElements(".rd-info-tpl-item-cont .tags-box .tag", workExperienceEl, 1);
                    let workInCompanyTags = [...(workInCompanyTagEls || [])].map(item => item.innerText);
                    let workInCompanyJobNameEl = await waitElement(".rd-info-tpl-item-cont .job-name");
                    let workInCompanyJobName = workInCompanyJobNameEl && workInCompanyJobNameEl.innerText;

                    let workInCompanyJobContentRowEls = (await waitElements(".rd-info-tpl-item-cont .rd-info-row", workExperienceEl, 1)) || [];
                    let workInCompanyJobContents = [];
                    for (let WICJCRE of workInCompanyJobContentRowEls) {
                        let colEls = (await waitElements(".rd-info-col", WICJCRE, 1)) || [];
                        for (let colEl of colEls) {
                            let keyNameEl = await waitElement(".rd-info-col-title", 1, colEl);
                            let keyName = keyNameEl && keyNameEl.innerText;
                            let valueNameEl = await waitElement(".rd-info-col-cont", 1, colEl);
                            let valueName = valueNameEl && valueNameEl.innerText;
                            workInCompanyJobContents.push({
                                key: keyName,
                                value: valueName
                            })
                        }
                    }

                    result.push({
                        workInCompany,
                        workInCompanyTime,
                        workInCompanyTags,
                        workInCompanyJobName,
                        workInCompanyJobContents
                    })
                }
            }

            return result;
        }

        async getProjectExperiences() {
            let projectExperiencesEl = await waitElement("#resume-detail-project-info", 1);
            let result = [];
            if (projectExperiencesEl) {
                let showMoreBtn = await waitElement(".rd-info-other-box", 1, projectExperiencesEl);
                if (showMoreBtn) {
                    showMoreBtn.click();
                    await sleep(500);
                }

                let projectExperienceEls = (await waitElements(".resume-detail-template-cont .rd-info-tpl-item", projectExperiencesEl, 1)) || [];
                for (let projectExperienceEl of projectExperienceEls) {
                    let ProjectExpNameEl = await waitElement(".rd-info-tpl-item-head .rd-work-comp>h5", 1, projectExperienceEl);
                    let ProjectExpName = ProjectExpNameEl && ProjectExpNameEl.innerText;
                    let ProjectExpTimeEl = await waitElement(".rd-info-tpl-item-head .rd-work-time", 1, projectExperienceEl);
                    let ProjectExpTime = ProjectExpTimeEl && ProjectExpTimeEl.innerText;

                    let ProjectExpJobContentRowEls = (await waitElements(".rd-info-tpl-item-cont .rd-info-row", projectExperienceEl, 1)) || [];
                    let ProjectExpJobContents = [];
                    for (let WICJCRE of ProjectExpJobContentRowEls) {
                        let colEls = (await waitElements(".rd-info-col", WICJCRE, 1)) || [];
                        for (let colEl of colEls) {
                            let keyNameEl = await waitElement(".rd-info-col-title", 1, colEl);
                            let keyName = keyNameEl && keyNameEl.innerText;
                            let valueNameEl = await waitElement(".rd-info-col-cont", 1, colEl);
                            let valueName = valueNameEl && valueNameEl.innerText;
                            ProjectExpJobContents.push({
                                key: keyName,
                                value: valueName
                            })
                        }
                    }

                    result.push({
                        ProjectExpName,
                        ProjectExpTime,
                        ProjectExpJobContents
                    })
                }
            }

            return result;
        }

        async getEduExperiences() {
            let educationsEl = await waitElement("#resume-detail-edu-info", 1);
            let result = [];
            if (educationsEl) {
                let educationEls = await waitElements(".rd-edu-info-item", educationsEl, 1);
                if (educationEls && educationEls.length) {
                    for (let educationEl of educationEls) {
                        let schoolBasicInfoEl = await waitElement(".rd-edu-info-item .edu-school-cont", 1, educationEl);
                        let schoolNameEl = await waitElement(".school-name", 1, schoolBasicInfoEl);
                        let schoolName = schoolNameEl && schoolNameEl.innerText;
                        let schoolSpecialEl = await waitElement(".school-special", 1, schoolBasicInfoEl);
                        let schoolSpecial = schoolSpecialEl && schoolSpecialEl.innerText;
                        let schoolDegreeEl = await waitElement(".school-degree", 1, schoolBasicInfoEl);
                        let schoolDegree = schoolDegreeEl && schoolDegreeEl.innerText;
                        let schoolTimeEl = await waitElement(".school-time", 1, schoolBasicInfoEl);
                        let schoolTime = schoolTimeEl && schoolTimeEl.innerText;

                        let schoolTagEls = await waitElements(".edu-school-tags", schoolBasicInfoEl, 1);
                        let schoolTags = [...(schoolTagEls || [])].map(item => item.innerText);
                        result.push({
                            schoolName,
                            schoolSpecial,
                            schoolDegree,
                            schoolTime,
                            schoolTags
                        })
                    }
                }
            }

            return result;
        }

        async getlanguages() {
            let languagesEl = await waitElement("#resume-detail-lang-info", 1);
            let result = [];
            if (languagesEl) {
                let languageItemEls = await waitElements(".rd-lang-item", languagesEl);
                if (languageItemEls && languageItemEls.length) {
                    for (let languageItemEl of languageItemEls) {
                        let languageNameEl = await waitElement(".lang-name", 1, languageItemEl);
                        let languageName = languageNameEl && languageNameEl.innerText;
                        let languageLevelEls = (await waitElements(".lang-level", languageItemEl, 1)) || [];
                        let languageLevels = [...languageLevelEls].map(item => item.innerText);

                        result.push({
                            languageName,
                            languageLevels
                        })
                    }
                }
            }
            return result;
        }

        async getSkills() {
            let skillsEl = await waitElement("#resume-detail-skill-info", 1);
            let result = [];
            if (skillsEl) {
                let skillTagEls = (await waitElements(".skill-tag-box .skill-tag", skillsEl, 1)) || [];


                if (skillTagEls && skillTagEls.length) {
                    result = [...skillTagEls].map(item => item.innerText)
                }
            }

            return result;
        }

        async getSelfEvaInfo() {
            let selfEvaInfoEl = await waitElement("#resume-detail-self-eva-info", 1);
            let result = "";
            if (selfEvaInfoEl) {
                let detailEl = await waitElement(".resume-detail-template-cont", 1, selfEvaInfoEl);
                if (detailEl) {
                    result = detailEl && detailEl.innerText;
                }
            }

            return result;
        }

        async getAdditionalInfo() {
            let additionalInfoEl = await waitElement("#resume-detail-addition-info", 1);
            let result = "";
            if (additionalInfoEl) {
                let detailEl = await waitElement(".resume-detail-template-cont", 1, additionalInfoEl);
                if (detailEl) {
                    result = detailEl && detailEl.innerText;
                }
            }
            return result;
        }

        /**
         * ReturnType<LiePinProfile["getAdditionalInfo"]
         * @param {{basicInfo: ReturnType<LiePinProfile["getBasicInfo"]>,jobExpectancies: ReturnType<LiePinProfile["getJobExpectancy"]>,workExperiences:ReturnType<LiePinProfile["getWorkExperiences"]>,projectExperiences: ReturnType<LiePinProfile["getProjectExperiences"]>,eduExperiences: ReturnType<LiePinProfile["getEduExperiences"]>,languages: ReturnType<LiePinProfile["getlanguages"]>,skills: ReturnType<LiePinProfile["getSkills"]>,selfEvaInfo: ReturnType<LiePinProfile["getSelfEvaInfo"]>,additionalInfo: ReturnType<LiePinProfile["getAdditionalInfo"]>}} info 
         */
        gatherAllInfo(info) {
            let { basicInfo, jobExpectancies, workExperiences, projectExperiences, eduExperiences, languages, skills, selfEvaInfo, additionalInfo } = info;
            let finalResult = {
                showName: null,
                skillLables: null,
                eduExpFormList: null,
                resSelfassess: null,
                professionInfo: null,
                basicInfoForm: null,
                resExpectInfoDtos: null,
                projectExpFormList: null,
                languageFormList: null,
                workExps: null,
                resAddition: null,
            };
            if (basicInfo) {
                let { name, status, sex, age, district, degree, workyear, salary, current_job_name, current_company_name } = basicInfo;
                finalResult.showName = name;
                finalResult.basicInfoForm = {
                    birthYearAge: age && this.parseNumber(age),
                    resHopeName: status,
                    resCompany: current_company_name,
                    resTitle: current_job_name,
                    workYearsDescr: workyear,
                    workStartYearAge: workyear && this.parseNumber(workyear),
                    sex,
                    eduLevelName: degree,
                    dqName: district,
                    salary,
                }
            }
            if (jobExpectancies) {
                finalResult.resExpectInfoDtos = jobExpectancies.map(item => {
                    let { jobExpectancyName, jobExpectancySalary, jobExpectancyDistrict, jobExpectancyLabels } = item;
                    return {
                        labels: jobExpectancyLabels,
                        wantJobtitleName: jobExpectancyName,
                        wantIndustryName: jobExpectancyLabels && jobExpectancyLabels.join('/') || "",
                        wantSalaryShow: jobExpectancySalary,
                        wantSalaryUpper: jobExpectancySalary && (Number((jobExpectancySalary.split('k')[0]).split('-')[1]) * 1000) || null,
                        wantSalaryLower: jobExpectancySalary && (Number(jobExpectancySalary.split('-')[0]) * 1000) || null,
                        wantSalMonths: jobExpectancySalary && this.parseNumber(jobExpectancySalary.split('×')[1]) || null,
                        wantDqName: jobExpectancyDistrict,
                    }
                })
            }
            if (workExperiences) {
                finalResult.workExps = workExperiences.map(item => {
                    let {
                        workInCompany,
                        workInCompanyTime,
                        workInCompanyTags,
                        workInCompanyJobName,
                        workInCompanyJobContents
                    } = item;
                    let { startYear, startMonth, endYear, endMonth, yearNum, monthNum } = this.parseTime(workInCompanyTime);
                    let salaryItem = workInCompanyJobContents.find(item => item.key.indexOf("薪") !== -1);
                    let dutyItem = workInCompanyJobContents.find(item => item.key.indexOf("职责") !== -1);
                    let dqItem = workInCompanyJobContents.find(item => item.key.indexOf("工作地点") !== -1);
                    let jobTitleItem = workInCompanyJobContents.find(item => item.key.indexOf("职位类别") !== -1);
                    let reportToItem = workInCompanyJobContents.find(item => item.key.indexOf("汇报对象") !== -1);
                    let rwDeptItem = workInCompanyJobContents.find(item => item.key.indexOf("所在部门") !== -1);
                    return {
                        startYear,
                        startMonth,
                        endYear,
                        endMonth,
                        workYearNum: yearNum,
                        workMonthNum: monthNum,
                        rwCompname: workInCompany,
                        rwSalary: salaryItem ? salaryItem.value.split('k')[0] : null,
                        rwSalmonths: salaryItem ? this.parseNumber(salaryItem.value.split('·')[1] || "") : null,
                        rwDuty: dutyItem ? dutyItem.value : "",
                        rwDqName: dqItem ? dqItem.value : "",
                        rwJobTitleName: jobTitleItem ? jobTitleItem.value : "",
                        rwReport2: reportToItem ? reportToItem.value : "",
                        rwDept: rwDeptItem ? rwDeptItem.value : "",
                        compTagList: workInCompanyTags.map(item => ({ tagName: item })),
                        rwTitle: workInCompanyJobName,
                    }
                })
            }
            if (projectExperiences) {
                finalResult.projectExpFormList =
                    projectExperiences.map(item => {
                        let { ProjectExpName,
                            ProjectExpTime,
                            ProjectExpJobContents } = item;
                        let rpdTitleItem = ProjectExpJobContents.find(item => item.key.indexOf("项目职务") !== -1);
                        let rpdDescItem = ProjectExpJobContents.find(item => item.key.indexOf("项目描述") !== -1);
                        let rpdDutyItem = ProjectExpJobContents.find(item => item.key.indexOf("项目职责") !== -1);
                        let rpdCompnameItem = ProjectExpJobContents.find(item => item.key.indexOf("所在公司") !== -1);
                        let rpdAchievementItem = ProjectExpJobContents.find(item => item.key.indexOf("项目业绩") !== -1);
                        let { startYear, startMonth, endYear, endMonth } = this.parseTime2(ProjectExpTime);
                        return {
                            startYear,
                            endYear,
                            startMonth,
                            endMonth,
                            rpdName: ProjectExpName,
                            rpdDesc: rpdDescItem ? rpdDescItem.value : "",
                            rpdDuty: rpdDutyItem ? rpdDutyItem.value : "",
                            rpdCompname: rpdCompnameItem ? rpdCompnameItem.value : "",
                            rpdTitle: rpdTitleItem ? rpdTitleItem.value : "",
                            rpdAchievement: rpdAchievementItem ? rpdAchievementItem.value : "",
                        }
                    })
            }

            if (eduExperiences) {
                finalResult.eduExpFormList =
                    eduExperiences.map(item => {
                        let { schoolName,
                            schoolSpecial,
                            schoolDegree,
                            schoolTime,
                            schoolTags } = item;
                        let { startYear, startMonth, endYear, endMonth } = this.parseTime2(schoolTime)
                        return {
                            startYear,
                            startMonth,
                            endYear,
                            endMonth,
                            redDegreeName: schoolDegree,
                            redSchool: schoolName,
                            redSpecial: schoolSpecial,
                            schoolGradeNames: schoolTags
                        }
                    })
            }
            if (languages) {
                finalResult.languageFormList =
                    languages.map(item => {
                        let { languageName,
                            languageLevels } = item
                        return {
                            languageTypeName: languageName,
                            otherTypeContent: languageName,
                            languageLevelFormList: languageLevels && languageLevels.map(item => ({
                                languageLevelName: item
                            })) || [],
                        }
                    })
            }

            if (skills) {
                finalResult.skillLables = skills
            }

            if (selfEvaInfo) {
                finalResult.resSelfassess = selfEvaInfo;
            }
            if (additionalInfo) {
                finalResult.resAddition = additionalInfo;
            }

            return finalResult;
        }


        parseTime(str = "") {
            try {
                let [range, text] = str.split(",");
                let [start, end] = range.split("-");
                let [startYear, startMonth] = start.split(".");
                let [endYear, endMonth] = end.split(".");
                let yearNum = text.split('年')[0] || '';
                let monthNum = text.split('年')[1] || text.split('月')[0] || '';
                monthNum = this.parseNumber(monthNum)
                if (endYear.indexOf("至今") !== -1) endYear = "9999";
                else if (endMonth.indexOf("至今") !== -1) endMonth = "99";
                startYear = this.parseNumber(startYear);
                startMonth = this.parseNumber(startMonth);
                endYear = this.parseNumber(endYear);
                endMonth = this.parseNumber(endMonth);
                yearNum = this.parseNumber(yearNum);
                monthNum = this.parseNumber(monthNum);

                console.log({ startYear, startMonth, endYear, endMonth, yearNum, monthNum });
                return { startYear, startMonth, endYear, endMonth, yearNum, monthNum }
            } catch (error) {
                console.log("error", error);
                return { startYear: 0, startMonth: 0, endYear: 0, endMonth: 0, yearNum: 0, monthNum: 0 }
            }



        }

        parseTime2(str = "") {
            try {
                let [range, text] = str.split(",");
                let [start, end] = range.split("-");
                let [startYear, startMonth] = start.split(".");
                let [endYear, endMonth] = end.split(".");
                if (endYear.indexOf("至今") !== -1) endYear = "9999";
                else if (endMonth.indexOf("至今") !== -1) endMonth = "99";

                startYear = this.parseNumber(startYear);
                startMonth = this.parseNumber(startMonth);
                endYear = this.parseNumber(endYear);
                endMonth = this.parseNumber(endMonth);
                console.log({ startYear, startMonth, endYear, endMonth });
                return { startYear, startMonth, endYear, endMonth }
            } catch (error) {
                console.log("error", error);
                return { startYear: 0, startMonth: 0, endYear: 0, endMonth: 0 }
            }
        }

        parseNumber(str) {
            str = String(str || "");
            console.log("str", str, typeof str);
            console.log("str result", Number(str.replace(/[^\d]/g, " ")));
            return Number(str.replace(/[^\d]/g, " "));
        }
    }

        
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

        
class Testmmm extends Base {
    static instance = new Testmmm();
    static getInstance() {
        if (!Testmmm.instance) Testmmm.instance = new Testmmm();
        return Testmmm.instance;
    }


    TEST_TYPE = "testMission"; // 测试任务类型
    TEST_TYPE2 = "testMission2"; // 测试任务类型2

    /**
     * 初始化
     */
    initialize() {
        // 查看当前标签页的参数，如果有参数，则直接开启任务
        console.log("initialized1234");
        console.log("initialized");
        ContentMessageHelper.getInstance().listenFromOthers(this.TEST_TYPE, this.handleGotTabParams.bind(this));
        ContentMessageHelper.getInstance().listenFromOthers(this.TEST_TYPE2, this.handleGotTabParams2.bind(this));
    }

    /** 1. 本页是测试页 ------------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * 搜索任务1
     * @param {string} keyword 搜索关键字
     */
    async handleGotTabParams(keyword) {
        console.log(keyword);
        this.keyword = keyword;
        try {
            const searchInput = await waitElement(".quickdelete-wrap input");
            const searchBtn = await waitElement("[value = '百度一下']");
            // 输入文本
            if (this.keyword) { // 输入内容
                fillTextOnInputOrTextarea(searchInput, this.keyword);
                await sleep(500);
            }
            // 点击搜索按钮
            searchBtn.click();
            await sleep(8000);
        } catch (error) {
            console.log("搜索失败", error);
        }

        return "我是完成了带的参数1";
    }


    /**
     * 搜索任务2
     * @param {string} keyword 搜索关键字
     */
    async handleGotTabParams2(keyword) {
        console.log(keyword);
        this.keyword = keyword;
        try {
            const searchInput = await waitElement(".quickdelete-wrap input");
            const searchBtn = await waitElement("[value = '百度一下']");
            // 输入文本
            if (this.keyword) { // 输入内容
                fillTextOnInputOrTextarea(searchInput, this.keyword);
                await sleep(500);
            }
            // 点击搜索按钮
            searchBtn.click();
            await sleep(8000);
        } catch (error) {
            console.log("搜索失败2", error);
        }

        return "我是完成了带的参数2";
    }
}

Testmmm.getInstance().initialize();

    
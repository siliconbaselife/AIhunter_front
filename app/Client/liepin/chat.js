const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const FormData = require('form-data');
const path = require('path');
const { rmDir } = require('../../utils/FileSystem');
const fs = require('fs');

const TabHelper = require("../../Extension/Tab");

class Chat extends Base {
    keywordDelay = 40;
    resumeDownloadedIds = {};
    messageCache = {};
    chatIdToPeopleIdCahche = {};
    recallIndex = 0;

    run = async () => {
        logger.info(`liepin ${this.userInfo.name} 聊天逻辑开始`);
        await this.setBefore();
        await this.noop();
        await this.setEnd();
    }

    setEnd = async () => {
        this.page.removeListener('response', this.getPeopleMessage);
    }

    setBefore = async () => {
        this.messageCache = {};

        await this.setMsgReceive();
        await this.setChatPage();
        await this.setDownloadPath.call(this);
    }

    /**
     * 点击跳转到沟通页面
     */
    setChatPage = async () => {
        await this.page.goto(this.chatUrl, { waitUntil: "domcontentloaded" });
        await sleep(2 * 1000);
    }

    /**
     * 监听获取一个人的消息列表
     */
    setMsgReceive = async () => {
        this.getPeopleMessage = async (response) => {
            const url = response.url();
            const request = response.request();
            const method = request.method();
            if (url.indexOf("com.liepin.im.h.chat.chat-list") !== -1 && (['GET', 'POST'].includes(method))) {

                try {
                    const res = await response.json();
                    if (res.flag == 1 && res.data) {
                        const { totalCount, list = [] } = res.data;
                        const messages = list || [];
                        // if (totalCount > 0 && totalCount == messages.length) { // 说明还有下一页, 滚动一下
                        //     await this.chatWindowScrollToTop();
                        //     await sleep(500);
                        // }
                        // console.log("messages", messages);

                        await this.dealPeopleMessage(messages.sort(() => -1));
                    }

                } catch (e) {
                    logger.error(`liepin ${this.userInfo.name} 获取peoplemessage消息error: `, e);
                }
            } else if (url.indexOf("im.h.contact.contact-list") !== -1 && (['GET', 'POST'].includes(method))) {
                try {
                    const res = await response.json();
                    if (res.flag == 1 && res.data) {
                        const { list = [] } = res.data;
                        if (list && list.length) {
                            list.forEach(item => {
                                const { oppositeImId, oppositeUserId } = item;
                                this.chatIdToPeopleIdCahche[oppositeImId] = oppositeUserId;
                            })
                        }
                    }

                } catch (e) {
                    logger.error(`liepin ${this.userInfo.name} 获取chatlist消息error: `, e);
                }
            }
        }

        this.page.on('response', this.getPeopleMessage);
    }

    /**
     * 处理一个人的消息列表并保存起来
     * @param {*} messages 
     */
    dealPeopleMessage = async (messages = []) => {
        const inclueOppsitePeopleMessageItem = messages.find(item => item.oppositeUserId);
        if (!inclueOppsitePeopleMessageItem) {
            logger.error(`liepin ${this.userInfo.name} 获取含有对方的消息记录失败 messages: ${JSON.stringify(messages || 'none')}`);
            return;
        }
        const id = inclueOppsitePeopleMessageItem.oppositeUserId;
        const chatid = inclueOppsitePeopleMessageItem.oppositeImId;
        logger.info(`liepin ${this.userInfo.name} 获取到 候选人 chatid: ${chatid} id: ${id} 的消息`);
        this.chatIdToPeopleIdCahche[chatid] = id;
        this.messageCache[id] = messages;
        // if (Array.isArray(this.messageCache[id])) {
        //     this.messageCache[id].push(...messages)
        // } else {
        //     this.messageCache[id] = messages;
        // }
    }

    noop = async () => {
        await this.dealUnreadNoop();

        while (true) {
            try {
                await this.doRecall();
                this.retryDealUnreadMsg = false;
                await this.dealUnreadNoop();
            } catch (e) {
                logger.error(`liepin ${this.userInfo.name} 处理召回异常: `, e);
                await sleep(5 * 1000);
            }
        }
    }

    dealUnreadNoop = async () => {
        let unreadNum = await this.hasUnread();
        // // 判断当前聊天的人是否未读
        // try {
        //     const peopleItem = await this.getHighLightItem();
        //     let unreadIsCurrentChat = peopleItem ? await this.unreadIsCurrentChat(peopleItem) : false;
        //     if (unreadIsCurrentChat) await this.dealOnePeople(peopleItem);
        // } catch (error) {
        //     logger.error(`liepin ${this.userInfo.name} 判断当前聊天的人是否未读 失败`, error)
        // }
        // // 判断当前聊天的人是否未读 end
        while (unreadNum > 0 && !this.retryDealUnreadMsg) {
            try {
                await this.doUnread();
            } catch (e) {
                logger.error(`liepin ${this.userInfo.name} 处理未读消息异常: `, e);
                await sleep(5 * 1000);
            }
            await sleep(5 * 1000);
            unreadNum = await this.hasUnread();
        }
    }

    doRecall = async () => {
        await this.putAllMessageBtn();
        let item = await this.fetchRecallItem();
        await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), item);
        let { id, name } = await this.fetchItemNameAndId(item);

        let recallInfo = await this.needRecall(id, name);

        // recallInfo = { recall_msg: "你好,有兴趣再聊下吗,我们这边很期待您的加入~" }; // 测试代码，记得删

        this.recallIndex += 1;
        if (!recallInfo) {
            await this.dealRecallEnd();
            return;
        }
        await item.click();
        await sleep(500);

        await this.sendMessage(recallInfo.recall_msg);
        await this.recallResult(id);

        await this.dealRecallEnd();
    }

    /**
     * 
     * @param {import("puppeteer").ElementHandle} item 
     */
    scrollChatToPosition = async (item) => {
        await this.page.evaluate((el) => el.scrollIntoView(), item);
    }

    fetchRecallItem = async () => {
        let items = await this.page.$x(`//div[not(contains(@class,'hide')) ]//div[contains(@class, "__im_pro__list-item")]`);
        return items[this.recallIndex];
    }

    /**
     * 循环二次召回
     */
    dealRecallEnd = async () => {
        let items = await this.page.$x(`//div[not(contains(@class,'hide')) ]//div[contains(@class, "__im_pro__list-item")]`);
        if (this.recallIndex + 1 >= items.length) {
            this.recallIndex = 0;
        }
    }

    needRecall = async (id, name) => {
        try {
            const { status, data } = await Request({
                url: `${BIZ_DOMAIN}/recruit/candidate/recallList`,
                data: {
                    accountID: this.userInfo.accountID,
                    candidateIDs: [id],
                    candidateIDs_read: []
                },
                headers: { "Connection": "keep-alive" },
                method: 'POST'
            });
            logger.info(`liepin ${this.userInfo.name} name: ${name} recall status: ${status} data: ${JSON.stringify(data)}`);

            if (status == 0) {
                let recallList = data;
                if (recallList.length > 0)
                    return recallList[0];
            }
        } catch (e) {
            logger.error(`liepin ${this.userInfo.name} name: ${name} recallList request error: `, e);
        }
    }

    recallResult = async (id) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/candidate/recallResult`,
            data: {
                accountID: this.userInfo.accountID,
                candidateID: id
            },
            headers: { "Connection": "keep-alive" },
            method: 'POST'
        });
        logger.info(`liepin ${this.userInfo.name} recallResult ${id} data: ${JSON.stringify(data)}`);
    }

    /**
     * 获取未读消息数量
     * @returns {Promise<number>}
     */
    hasUnread = async () => {
        const unreadNum = await this.page.evaluate(() => {
            const unreadEl = document.querySelector(".ant-tabs-nav-list .ant-tabs-tab:nth-of-type(1) sup.ant-scroll-number");
            if (unreadEl) return Number(unreadEl.getAttribute("title")) || 0;
            else return 0;
        });

        logger.info(`liepin ${this.userInfo.name} 有 ${unreadNum} 个未读消息`)

        return unreadNum;
    }

    doUnread = async () => {
        let unreadNum = await this.hasUnread();
        if (unreadNum == 0)
            return;
        logger.info(`liepin ${this.userInfo.name} 有 ${unreadNum} 个未读消息`);

        await this.setUnreadPage();
        await this.dealUnreadMsg(unreadNum);
        await this.setUnreadEnd();
    }

    /**
     * 处理所有未读消息
     * @param {number} unreadNum 通过小红点判断的未读消息数量
     */
    dealUnreadMsg = async (unreadNum) => {
        let items = await this.waitElements(`//div[contains(@id, "im-search")]//div[contains(@class, "__im_pro__list-item")]`, this.page);
        logger.info(`liepin ${this.userInfo.name} 获取到 ${items.length} 个未读item`);
        let index = 0;
        while (index < items.length) {
            items = await this.waitElements(`//div[contains(@id, "im-search")]//div[contains(@class, "__im_pro__list-item")]`, this.page);
            const item = items[index];
            await this.scrollChatToPosition(item);
            try {
                await this.dealOnePeople(item);
            } catch (e) {
                logger.error(`liepin ${this.userInfo.name} 处理未读消息出现异常: `, e);
            }

            index += 1;
        }

        if (items.length != unreadNum && !this.retryDealUnreadMsg) { // 猎聘未读列表貌似有bug, 有时有些未读消息不会展示在未读列表
            this.retryDealUnreadMsg = true; // 尝试一次，后面如果判断 未读数 和 在未读消息列表 数量还是不一样的话，就不卡在这里了
            try {
                await this.putAllMessageBtn();
                let items = await this.page.$x(`//div[not(contains(@class,'hide')) ]//div[contains(@class, "__im_pro__list-item")]`);
                for (let item of items) {
                    const [numberDiv] = await item.$$(`div.__im_basic__avatar:nth-of-type(1)`);
                    if (numberDiv) {
                        const number = await this.page.evaluate(node => Number(node.innerText), numberDiv);

                        // 跟上面一样的处理
                        if (number > 0) {
                            await this.scrollChatToPosition(item);

                            try {
                                await this.dealOnePeople(item);
                            } catch (e) {
                                logger.error(`liepin ${this.userInfo.name} 处理未读消息2出现异常: `, e);
                            }

                            index += 1;
                        }
                    }
                }
            } catch (error) {
                logger.error(`liepin ${this.userInfo.name} 处理未读消息差异出现异常: `, error);
            }
        }
    }

    /**
     * 处理一个人的未读消息
     * @param {import("puppeteer").ElementHandle} item 
     */
    dealOnePeople = async (item) => {
        await this.page.evaluate((item) => item.scrollIntoView(), item);
        await item.click();
        await sleep(2 * 1000);

        let { id, name } = await this.fetchItemNameAndId(item);

        if (name === "小猎客服") {
            logger.info(`liepin ${this.userInfo.name} 候选人 ${id} ${name}, 对方是客服, 已跳过`);
            return;
        }

        logger.info(`liepin ${this.userInfo.name} 当前处理 ${id} ${name} 的消息`);

        let messages = await this.fetchPeopleMsgsByCache(id);
        logger.info(`liepin ${this.userInfo.name} id: ${id} http请求处理后的消息: ${JSON.stringify(messages)}`);
        if (!messages) {
            logger.info(`liepin ${this.userInfo.name} 当前处理 ${name} 异常, http获取不到消息`);
            messages = await this.fetchMsgsByHtml(name);
        }

        const lastMessage = messages && messages[messages.length - 1];
        if (lastMessage.msg && lastMessage.msg.indexOf("你已向对方索要") !== -1) return; // 这种消息直接跳过
        await this.chatOnePeopleNoop(id, name, messages);
    }

    chatOnePeopleNoop = async (id, name, messages) => {
        await this.dealSystemView(id, name);
        while (messages && messages.length > 0) {
            let needTalk = await this.needTalk(messages);
            if (!needTalk)
                break;

            let noTalk = await this.chatWithRobot(id, name, messages);
            if (noTalk)
                break;

            await sleep(10 * 1000);
            await this.dealSystemView(id, name);
            messages = await this.fetchMsgsByHtml(name);
        }
    }

    needTalk = async (messages) => {
        let index = messages.length - 1;
        while(index >= 0) {
            if (messages[index].speaker == "user")
                return true;

            if (messages[index].speaker == "system") {
                index -= 1;
                continue;
            }

            if (messages[index].speaker == "robot")
                return false;
        }

        return false;
    }

    /**
     * 获取当前高亮的item
     * @returns {Promise<import("puppeteer").ElementHandle>}
     */
    async getHighLightItem() {
        let item = null;
        try {
            [item] = await this.page.$x(`//div[not(contains(@class,'hide')) ]//div[contains(@class, "__im_pro__list-item") and contains(@class, "active")]`).catch(() => null);
        } catch { }
        return item;
    }

    async unreadIsCurrentChat(item) {
        const { name, id } = await this.fetchItemNameAndId(item);
        let messages = await this.fetchPeopleMsgsByCache(id);
        if (!messages) {
            logger.info(`liepin ${this.userInfo.name} 当前处理 ${name} 异常, http获取不到消息`);
            messages = await this.fetchMsgsByHtml(name);
        }
        if (messages[messages.length - 1].speaker === "user") {
            return true
        }
        return false;
    }

    fetchMsgsByHtml = async (name) => {
        let messages = [];
        let msgItems = await this.page.$x(`//div[contains(@class, "__im_pro__msg-list-content")]/div[contains(@class, "__im_pro__message")]`);
        for (let msgItem of msgItems) {
            let { speaker, txt } = await this.fetchItemMsg(msgItem, name);
            if (!txt || txt.length == 0)
                continue;

            messages.push({
                speaker: speaker,
                msg: txt
            });
        }
        logger.info(`liepin ${this.userInfo.name} name: ${name} html处理后的消息: ${JSON.stringify(messages)}`);

        return messages;
    }

    fetchItemMsg = async (msgItem, name) => {
        let [txtSpan] = await msgItem.$x(`//div[contains(@class, "__im_UI__txt-content")]`);
        if (!txtSpan)
            return { speaker: "system", txt: "" };

        let txt = await this.page.evaluate(node => node.innerText, txtSpan);

        let speaker = "system";
        let [friendSpan] = await msgItem.$x(`//div[contains(@class, "__im_pro__message-receive")]`);
        if (friendSpan)
            speaker = "user";
        let [robotSpan] = await msgItem.$x(`//div[contains(@class, "__im_pro__message-send")]`);
        if (robotSpan)
            speaker = "robot";

        let systemTxt = await this.isSystemSpeaker(undefined, txt);
        if (systemTxt)
            speaker = "system";
        return { speaker, txt };
    }

    /**
     * 从cache中获取某人的聊天信息
     * @param {string | number} id 候选人id 
     * @returns 
     */
    fetchPeopleMsgsByCache = async (id) => {
        let messagesRaw = this.messageCache[id];
        if (!messagesRaw)
            return;


        let messages = [];
        for (let messageRaw of messagesRaw) {
            let txt = await this.fetchTxt(messageRaw);
            logger.info(`liepin ${this.userInfo.name} 读取message txt: ${txt}`)
            if (!txt)
                continue;

            let speaker = await this.fetchSpeaker(messageRaw, txt);
            let noUse = await this.isNoUserMsg(messageRaw, txt);
            if (noUse)
                continue;

            messages.push({
                speaker: speaker,
                msg: txt,
                time: messageRaw.msgTime
            });
        }
        delete this.messageCache[id];
        return messages;
    }

    fetchTxt = async (message) => {
        const payload = message.payload;
        if (!payload)
            return;
        let payloadObj;
        try {
            payloadObj = JSON.parse(payload)
        } catch (error) {
            logger.error(`liepin ${this.userInfo.name} 读取聊天文本异常message: ${JSON.stringify(message)}`, e);
            return "";
        }

        const body = payloadObj.body || payloadObj.bodies || [];
        const txt = body[0] && body[0].msg;
        return txt;
    }

    fetchSpeaker = async (message, txt) => {
        const direction = message.direction;

        let system = await this.isSystemSpeaker(message, txt);
        if (system) return "system";

        if (direction == "0")
            return "robot";

        return "user"
    }

    isSystemSpeaker = async (message, txt = "") => {
        if (message) {
            const payload = message.payload;
            if (!payload) return false;
            const payloadObj = JSON.parse(payload)
            const pushType = payloadObj.push;
            if (pushType == "0") return true; // 0是系统，1是真人
        }

        if (txt.indexOf("更换了与您沟通的职位") !== -1 || txt.indexOf("向对方索要手机号") !== -1) return true;
        return false;
    }

    isNoUserMsg = async (message, txt = "") => {
        if (message.msgType == "img") {
            return true;
        }
        if (txt.indexOf("[简历卡片]") !== -1 || txt.indexOf("[职位卡片]") !== -1 || txt.indexOf("[卡片消息]") !== -1 || txt.indexOf("温馨提示：") !== -1 || txt.indexOf("*******") !== -1)
            return true;

        return false;
    }

    chatWithRobot = async (id, name, messages) => {
        logger.info(`liepin ${this.userInfo.name} people: ${name} 历史消息: ${JSON.stringify(messages)} 准备跟AI聊天`);
        let nextStep, nextStepContent;

        try {
            let d = await this.chatToGpt(id, name, messages);
            nextStep = d.nextStep;
            nextStepContent = d.nextStepContent;
            logger.info(`liepin ${this.userInfo.name} ${name} nextStep: ${nextStep} nextStepContent: ${nextStepContent}`);

            if (nextStep.length == 0)
                return;

            await this.sendMessage(nextStepContent);

            if (nextStepContent.length === 0 && nextStep != "noTalk")
                await this.sendEmoji();

            if (nextStep === "need_contact") {
                await sleep(1000);
                try {
                    logger.info(`liepin ${this.userInfo.name} ${name} 获取联系方式`);
                    await this.sendContact();
                } catch (e) {
                    logger.error(`liepin ${this.userInfo.name} ${name} 申请手机号异常: `, e);
                }
            }

            if (nextStep == "noTalk")
                return true;
        } catch (e) {
            logger.error(`liepin ${this.userInfo.name} ${name} 聊天发生异常: `, e);
        }
        return false;
    }

    sendContact = async () => {
        let [resumeBtn] = await this.page.$x(`//div[contains(@class, "chatwin-action")]//span[contains(@class, "action-resume")]//span[contains(@class, "__im_pro__action-svg-item-title") and text()="求简历"]`);
        logger.info(`liepin ${this.userInfo.name} 简历按钮: `, resumeBtn);
        if (resumeBtn) {
            await this.page.evaluate(el => el.click(), resumeBtn);
            const dialogEl = await this.waitElement(`//div[contains(@class, "__im_basic__askfor-confirm-modal")]`, this.page, 5);
            if (dialogEl) {
                await sleep(300);
                const success = await this.page.evaluate(() => {
                    const confirmBtn = document.querySelector(".__im_basic__askfor-confirm-modal button.ant-btn-primary");
                    if (confirmBtn) {
                        confirmBtn.click();
                        return true;
                    }
                    return false;
                })
                if (success) await sleep(500);
            }
        }

        let [wxBtn] = await this.page.$x(`//div[contains(@class, "chatwin-action")]//span[contains(@class, "action-wechat")]//span[contains(@class, "__im_pro__action-svg-item-title") and text()="索要微信"]`);
        logger.info(`liepin ${this.userInfo.name} wx按钮: `, wxBtn);
        if (wxBtn) {
            await this.page.evaluate(el => el.click(), wxBtn);
            const dialogEl = await this.waitElement(`//div[contains(@class, "__im_basic__askfor-confirm-modal")]`, this.page, 5);
            if (dialogEl) {
                await sleep(300);
                const success = await this.page.evaluate(() => {
                    const confirmBtn = document.querySelector(".__im_basic__askfor-confirm-modal button.ant-btn-primary");
                    if (confirmBtn) {
                        confirmBtn.click();
                        return true;
                    }
                    return false;
                })
                if (success) await sleep(500);
            }
        }

        let [phoneBtn] = await this.page.$x(`//div[contains(@class, "chatwin-action")]//span[contains(@class, "action-phone")]//span[contains(@class, "__im_pro__action-svg-item-title") and text()="索要手机"]`);
        logger.info(`liepin ${this.userInfo.name} 电话按钮: `, phoneBtn);
        if (phoneBtn) {
            await this.page.evaluate(el => el.click(), phoneBtn);
            const dialogEl = await this.waitElement(`//div[contains(@class, "__im_basic__askfor-confirm-modal")]`, this.page, 5);
            if (dialogEl) {
                await sleep(300);
                const success = await this.page.evaluate(() => {
                    const confirmBtn = document.querySelector(".__im_basic__askfor-confirm-modal button.ant-btn-primary");
                    if (confirmBtn) {
                        confirmBtn.click();
                        return true;
                    }
                    return false;
                })
                if (success) await sleep(500);
            }
        }
    }

    sendEmoji = async () => {
        let [emojiBtn] = await this.page.$x(`//div[contains(@class, "__im_pro__top-options")]//div[contains(@class, "__im_pro__emoji-wrap")]`);
        await emojiBtn.click();
        let emotionDiv = await this.waitElement(`//div[contains(@class, "__im_basic__emotions-wrapper")]`, this.page);

        let emoji2Btn = await emotionDiv.$(`div.__im_basic__emoji-item[title = "[呲牙]"]`);
        await emoji2Btn.click();
        await this.page.keyboard.down('Enter');
        await sleep(500);
    }

    sendMessage = async (msg) => {
        const msgList = msg.split('\n');
        logger.info(`liepin ${this.userInfo.name} sendMessage: ${msgList}`);

        let [input] = await this.page.$x('//div[contains(@id, "im-chatwin")]//textarea[contains(@class, "__im_pro__textarea")]');

        await input.focus();
        await sleep(500);

        for (let msgItem of msgList) {
            if (msgItem.length === 0)
                continue;

            await this.page.keyboard.type(msgItem, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
            await sleep(500);
            await this.page.keyboard.down('Enter');
            await sleep(500);
        }
    }

    chatToGpt = async (id, name, messages) => {
        if (messages.length == 0)
            return new Promise((resolve, reject) => {
                reject({ nextStep: "", nextStepContent: "" })
            });

        const data = await Request({
            url: `${BIZ_DOMAIN}/recruit/candidate/chat/v2`,
            data: {
                accountID: this.userInfo.accountID,
                candidateID: id,
                candidateName: name,
                historyMsg: messages,
                jobID: "",
                timeout: 3 * 60 * 1000
            },
            method: 'POST'
        });

        logger.info(`liepin ${this.userInfo.name} chatToGpt data: ${JSON.stringify(data)}`);

        return new Promise((resolve, reject) => {
            if (data.ret != 0)
                reject({
                    nextStep: "",
                    nextStepContent: ""
                })

            resolve(data.data);
        });
    }

    dealSystemView = async (id, name) => {
        await this.clickOkAll();
        await this.dealSystemResume(id, name);
        await this.dealWX(id, name);
        await this.dealPhone(id, name);
    }

    clickOkAll = async () => {
        let agreeBtns = await this.page.$x(`//div[contains(@id, "im-chatwin")]//div[contains(@class, "__im_basic__universal-card-btn-main") and ((text()="同意") or (text()="查看") )and not(contains(@class,'disable'))]`);
        for (let agreeBtn of agreeBtns) {
            await agreeBtn.click();
            await sleep(500);
        }
    }

    dealSystemResume = async (id, name) => {
        const [btn] = await this.page.$x(`//div[contains(@class, "chatwin-action")]//span[contains(@class, "action-resume")]//span[contains(@class, "__im_pro__action-svg-item-title") and text()="看简历"]/parent::span`)
        if (btn && !this.resumeDownloadedIds[id]) { // resumeDownloadedIds是用来记录一下，不用重复下载简历
            await this.dealResume(id, name);
            this.resumeDownloadedIds[id] = true;
        }
    }

    dealResume = async (id, name) => {
        try {
            await this.makeDownloadDir();
            await this.downloadResume();
            await this.uploadResume(id, name);
            await this.clearDownloadDir();
        } catch (error) {
            logger.error(`liepin ${this.userInfo.name} id: ${id} name: ${name} 处理简历出错:`, error);
        }
    }

    downloadResume = async () => {
        const httpUrl = await this.stopOpenAndGetUrl(this.page, `.chatwin-action span.action-resume`, 2000);
        const tab = await TabHelper.createATab({ selected: false, active: false, url: httpUrl });
        await sleep(1000);
        const { status, error } = await TabHelper.sendMessageToTab(tab.id, "liepinDownloadResume");
        TabHelper.closeTab(tab.id);
        if (status !== "success") {
            logger.error(`liepin ${this.userInfo.name} 下载简历出错:`, error);
            throw new Error("下载简历出错")
        }

        await sleep(2 * 1000);
    }

    uploadResume = async (id, name) => {
        let filedir = path.join(process.cwd(), this.userInfo.accountID.toString());
        console.log("filedir: ", filedir);
        let files = fs.readdirSync(filedir);
        let filename = files[0];
        const crs = fs.createReadStream(filedir + "/" + filename);

        const form = new FormData();
        form.append('cv', crs);
        form.append('jobID', '');
        form.append('accountID', this.userInfo.accountID);
        form.append('candidateID', id);
        form.append('candidateName', name);
        form.append('filename', filename);

        console.log(`accountID: ${this.userInfo.accountID} candidateID: ${id} candidateName: ${name} filename: ${filename}`);

        await form.submit(`${BIZ_DOMAIN}/recruit/candidate/result/v2`, function (err, res) {
            if (err) {
                logger.error(`简历上传失败error: `, err)
            }
        });
        await sleep(2 * 1000);
    }

    makeDownloadDir = async () => {
        let dirPath = path.join(process.cwd(), this.userInfo.accountID.toString());
        logger.info(`liepin ${this.userInfo.name} 下载路径: `, dirPath);
        try {
            await rmDir(dirPath);
            fs.mkdir(dirPath, (err) => {
                if (err) {
                    logger.error(`liepin ${this.userInfo.name} 新建目录出错:`, err);
                }
            })
        } catch (e) {
            logger.error(`liepin ${this.userInfo.name} 新建目录出错:`, e);
        }
    }

    clearDownloadDir = async () => {
        let dirPath = path.join(process.cwd(), this.userInfo.accountID.toString());
        try {
            await rmDir(dirPath);
        } catch (e) {
            logger.error(`liepin ${this.userInfo.name} 清理目录出错:`, e);
        }
    }

    dealWX = async (id, name) => {
        const wxSpanEl = await this.waitElement(`//div[contains(@class, "__im_basic__universal-card-content")]//span[contains(text(), "的微信")]`, this.page, 2);
        if (!wxSpanEl) {
            // logger.error(`liepin ${this.userInfo.name} 获取 ${name} 的微信失败`, wxSpanEl);
            return;
        }
        let wx = await this.page.evaluate(node => node.innerText, wxSpanEl);
        wx = wx.replace(`${name}的微信：`, "").replace(`${name}发送的微信：`, "");
        logger.info(`liepin ${this.userInfo.name} 获取到 ${name} 的微信: ${wx}`);

        const form = new FormData();

        const reqParam = {
            accountID: this.userInfo.accountID,
            candidateID: id,
            candidateName: name
        }

        Object.keys(reqParam).map((key) => {
            form.append(key, reqParam[key]);
        })

        form.append("wechat", wx);
        form.append("jobID", "");

        form.submit(`${BIZ_DOMAIN}/recruit/candidate/result/v2`, function (err) {
            if (err) {
                logger.error(`微信上传失败error: `, e)
            }
        });
        await sleep(500);
    }

    dealPhone = async (id, name) => {
        const phoneSpanEl = await this.waitElement(`//div[contains(@class, "__im_basic__universal-card-content")]//span[contains(text(), "的手机号")]`, this.page, 2);
        if (!phoneSpanEl) {
            // logger.error(`liepin ${this.userInfo.name} 获取 ${name} 的手机号失败`, phoneSpanEl);
            return;
        }
        let phone = (await this.page.evaluate(node => node.innerText, phoneSpanEl)) || "";
        phone = phone.replace(`${name}的手机号：`, "").replace(`${name}发送的手机号：`, "");
        logger.info(`liepin ${this.userInfo.name} 获取到 ${name} 的手机号: ${phone}`);

        const form = new FormData();

        const reqParam = {
            accountID: this.userInfo.accountID,
            candidateID: id,
            candidateName: name
        }

        Object.keys(reqParam).map((key) => {
            form.append(key, reqParam[key]);
        })

        form.append("phone", phone);
        form.append("jobID", "");

        form.submit(`${BIZ_DOMAIN}/recruit/candidate/result/v2`, function (err) {
            if (err) {
                logger.error(`手机号上传失败error: `, e)
            }
        });
        await sleep(500);
    }

    fetchItemNameAndId = async (item) => {
        let [nameSpan] = await item.$x(`//span[contains(@class, "__im_pro__contact-title-name")]`);
        let name = await this.page.evaluate(node => node.innerText, nameSpan);
        // let [idSpan] = await item.$x(`//div[contains(@class, "geek-item")]`);
        const isStr = await this.page.evaluate((el) => el.dataset.info, item);
        // let isStr = await this.page.evaluate(node => node.key, item);
        let chatId, id;
        try {
            chatId = JSON.parse(decodeURIComponent(isStr)).to_imid
            id = this.chatIdToPeopleIdCahche[chatId];
        } catch (error) {
            logger.error(`liepin ${this.userInfo.name} 获取一个人 id 失败 isStr=${isStr} name: ${name}, error: ${error && error.message || error}`);
            return { name };
        }

        logger.info(`liepin ${this.userInfo.name} 获取到 id: ${id} name: ${name}`);
        return { id, name };
    }

    /**
     * 聊天窗口滚动到最高(为了获取以往消息)
     */
    async chatWindowScrollToTop() {
        try {
            await this.page.evaluate(() => {
                const scrollContainer = document.querySelector(".__im_pro__chat-list div[data-overlayscrollbars-viewport]");
                scrollContainer.scrollTo(0, 0);
            })
        } catch (error) {
            logger.error(`liepin ${this.userInfo.name} 移动到顶部失败`);
        }
    }

    /**
     * 点击未读按钮，切换到未读tab
     */
    putUnreadBtn = async () => {
        let unreadBtn = await this.waitElement(`//div[contains(@id, "im-search")]//button[contains(@id, "unRead") and not(contains(@class, "active"))]`, this.page);
        if (unreadBtn) {
            await unreadBtn.click();
            await sleep(1000);
        }
    }

    /**
     * 点击全部按钮，却换到全部消息tab
     */
    putAllMessageBtn = async () => {
        let allBtn = await this.waitElement(`//div[contains(@class, "ant-space-item")]//span[text() = "全部"]/parent::button[not(contains(@class, "active"))]`, this.page, 1);
        if (allBtn) {
            await allBtn.click();
            await sleep(2 * 1000);
        }
    }

    setUnreadPage = async () => {
        await this.putUnreadBtn();
        await sleep(1000);
    }

    setUnreadEnd = async () => {
        await this.putAllMessageBtn();
        await sleep(1000);
    }
}

module.exports = Chat;
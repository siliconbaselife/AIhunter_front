const Base = require('./Base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Chat extends Base {
    keywordDelay = 40;
    constructor(options) {
        super(options);
    }

    run = async() => {
        await this.refresh();
        logger.info(`linkedin ${this.userInfo.name} 聊天启动`);
        while (global.running) {
            let unreadFlag = await this.hasUnread();
            if (!unreadFlag) {
                logger.info(`linkedin ${this.userInfo.name} 没有未读消息`);
                await sleep(30 * 1000);
                continue;
            }

            await this.chatList();
            await this.refresh();
        }
    }

    hasUnread = async() => {
        let msgBtn = await this.waitElement(`//span[contains(@title, "Messaging")]/parent::*/parent::*`, this.page);

        let [unreadSpan] = await msgBtn.$x(`//span[contains(@class, "notification-badge__count")]`);
        if (!unreadSpan)
            return false;

        let num = await this.page.evaluate(node => node.innerText, unreadSpan);
        logger.info(`linkedin ${this.userInfo.name} 有 ${num} 个未读消息`);

        return num > 0;
    }

    chatList = async() => {
        await this.toChatPage();
        await this.chatOnePeople();
        await this.closeAllMsgDivs();

        while (true) {
            let unreadMsgItem = await this.fetchUnreadMsgItem();
            
            if (unreadMsgItem) {
                await unreadMsgItem.click();
                await sleep(500);
                await this.chatOnePeople();
            } else {
                let hasMore = await this.nextPage();
                if (!hasMore) {
                    logger.info(`linkedin ${this.userInfo.name} 消息遍历完成`);
                    break;
                }
            }

            await this.closeAllMsgDivs();
        }
    }

    nextPage = async() => {
        let lis = await this.page.$x(`//li[contains(@class, "ember-view")]`);
        let beforeNum = lis.length;

        await this.page.evaluate((item) => item.scrollIntoView({ block: "center" }), lis[lis.length - 1]);
        await this.sleep(500);

        let newlis = await this.page.$x(`//li[contains(@class, "ember-view")]`);
        let newNum = newlis.length;

        return !(beforeNum == newNum);
    }

    fetchUnreadMsgItem = async() => {
        let newMsgItems = await this.page.$x(`//li[contains(@class, "ember-view")]//span[contains(@class, "notification-badge__count")]`);
        return newMsgItems[0];
    }

    chatOnePeople = async() => {
        let id = await this.fetchPeopleid();

        while(true) {
            let messages = await this.fetchMsgs();
            logger.info(`linkedin ${this.userInfo.name} id: ${id} 获取到聊天记录: ${messages}`);

            let needTalk = await this.needTalkCheck(messages);
            if (!needTalk) {
                logger.info(`linkedin ${this.userInfo.name} id: ${id} 聊天结束`);
                break;
            }
            await this.chatToPeople(messages);

            await this.closeAllMsgDivs();
        }
    }

    chatToPeople = async(messages, id) => {
        logger.info(`linkedin ${this.userInfo.name} 给 ${id} 说话`);
        let nextStep, nextStepContent;
        let name = await this.fetchFriendName();

        try {
            let d = await this.chatToGpt(id, name, messages);
            nextStep = d.nextStep;
            nextStepContent = d.nextStepContent;
            logger.info(`linkedin ${this.userInfo.name} 脉脉聊天 nextStep: ${nextStep} nextStepContent: ${nextStepContent}`);

            // nextStepContent = ""
            if (nextStep.length !== 0)
                await this.sendMessage(nextStepContent);

            if (nextStepContent.length === 0 && nextStep != "noTalk" && nextStep.length != 0)
                await this.sendEmoji();
        } catch (e) {
            logger.error(`linkedin ${this.userInfo.name} ${id} 聊天发生异常:`, e);
            await sleep(5 * 1000);
        }
    }

    sendEmoji = async () => {
        let [btn] = await this.page.$x(`//button[contains(@title, "Open Emoji Keyboard")]`);
        await btn.click();
        await sleep(500);

        let [smileBtn] = await this.waitElement(`//button[contains(@title, "smiling face with smiling eyes")]`, this.page);
        await smileBtn.click();
        await sleep(1000);

        let [send] = await this.page.$x(`//button[contains(@class, "msg-form__send-button") and text() = "Send"]`);
        await send.click();
        await sleep(1000);
    }

    sendMessage = async (msg) => {
        const msgList = msg.split('\n');
        logger.info(`linkedin ${this.userInfo.name} linkedin sendMessage: `, msgList);

        let [input] = await this.page.$x('//div[contains(@class, "form__contenteditable")]');
        await input.focus();
        await input.click();
        await sleep(500);

        for (let msgItem of msgList) {
            if (msgItem.length === 0)
              continue;
    
            await this.page.keyboard.type(msgItem, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
            await sleep(1000);
            let [send] = await this.page.$x(`//button[contains(@class, "msg-form__send-button")]`);
            await send.click();
            await sleep(1000);
        }
    }

    chatToGpt = async(id, name, messages) => {
        if (messages.length == 0)
          return new Promise((resolve, reject) => {
            reject({ nextStep: "", nextStepContent: "" })
          });
  
        const data = await Request({
            url: `${BIZ_DOMAIN}/recruit/candidate/chat`,
            data: {
              accountID: this.accountID,
              candidateID: id,
              candidateName: name,
              historyMsg: messages,
              jobID: "",
              timeout: 3 * 60 * 1000
            },
            method: 'POST'
          });

        logger.info(`linkedin ${this.userInfo.name} ${id} chatToGpt data: ${JSON.stringify(data)}`);
  
        return new Promise((resolve, reject) => {
          if (data.ret != 0)
            reject({
              nextStep: "",
              nextStepContent: ""
            })
          resolve(data.data);
        });
    }

    needTalkCheck = async(messages) => {
        if (messages.length == 0)
            return false;

        if (messages[messages.length - 1].userType == "robot")
            return false;

        return true;
    }

    fetchMsgs = async() => {
        let friendName = await this.fetchFriendName();
        logger.info(`linkedin ${this.userInfo.name} 开始获取 ${friendName} 的消息`);

        let messagesSpans = await this.page.$x(`//li[contains(@class, "msg-s-message-list__event")]`);
        let messages = [];
        let nowName;
        for (let i in messagesSpans) {
            let messagesSpan = messagesSpans[i];
            let [nameSpan] = await messagesSpan.$x(`//span[contains(@class, "msg-s-message-group__name")]`);

            let msgName;
            if (nameSpan) {
                msgName =  await this.page.evaluate(node => node.innerText, nameSpan);
            }

            if (!msgName) {
                nowName = msgName;
            }

            if (!nowName) {
                logger.info(`linkedin ${this.userInfo.name} 萃取消息名字 出现异常 index = ${i}`);
            }

            let userType;
            if (nowName == friendName) {
                userType = "user"
            } else {
                userType = "robot"
            }

            let [msgTxtSpan] = await messagesSpan.$x(`//p[contains(@class, "msg-s-event-listitem__body")]`);
            if (!msgTxtSpan) {
                continue;
            }
            let msgText = await this.page.evaluate(node => node.innerText, msgTxtSpan);
            messages.push({
                speaker: userType,
                msg: msgText
            })
        }

        return messages;
    }

    fetchFriendName = async () => {
        let [nameDiv] = await this.page.$x(`//h2[contains(@class, "msg-entity-lockup__entity-title")]`);
        let name = await this.page.evaluate(node => node.innerText, nameDiv);
        name = name.trim();
        return name
    }

    fetchPeopleid = async() => {
        let titleSpan = await this.waitElement(`//h2[contains(@id, "thread-detail-jump-target")]`, this.page);
        await titleSpan.click();

        await this.waitElement(`//div[contains(@id, "profile-content")]`, this.page);

        let url = await this.page.url();
        let id = url;

        await this.page.goback();
        await this.waitElement(`//main[contains(@class, "scaffold-layout__main scaffold-layout__list-detail")]`, this.page);

        return id;
    }

    toChatPage = async() => {
        logger.info(`linkedin ${this.userInfo.name} 准备跳转到聊天界面`);
        await this.refresh();
        let msgBtn = await this.waitElement(`//span[contains(@title, "Messaging")]/parent::*/parent::*`);
        await msgBtn.click();

        await this.waitElement(`//main[contains(@class, "scaffold-layout__main scaffold-layout__list-detail")]`, this.page, 20);
    }   
}

module.exports = Chat;
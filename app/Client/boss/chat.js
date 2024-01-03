const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const FormData = require('form-data');

class Chat extends Base {
    keywordDelay = 40;
    messageCache = {};
    recallIndex;

    run = async() => {
        logger.info(`脉脉 ${this.userInfo.name} 聊天逻辑开始`);
        await this.setBefore();
        await this.noop();
        await this.setEnd();
    }

    setEnd = async() => {
        await this.page.removeListener('response', this.getPeopleMessage);
    }

    setBefore = async() => {
        this.messageCache = {};

        await this.setMsgReceive();
        await this.setChatPage();
    }

    setChatPage = async() => {
        let jobManageBtn = await this.page.$x(`//a[contains(@ka, "menu-manager-job")]`);
        await jobManageBtn.click();
        await sleep(500);

        let chatBtn = await this.page.$x(`//a[contains(@ka, "menu-im")]`);
        await chatBtn.click();
        await sleep(500);

        await this.waitElement(`//div[contains(@class, "chat-box")]`);
    }

    setMsgReceive = async() => {
        const getPeopleMessage = async (response) => {
            const url = response.url();
            if (url.startsWith('https://www.zhipin.com/wapi/zpchat/boss/historyMsg')) {

              const itemRes = await response.json();
    
              let { zpData: { hasMore, messages } = {} } = itemRes || {};
              await this.dealPeopleMessage(messages);
            }
        }

        this.page.on('response', getPeopleMessage);
    }

    dealPeopleMessage = async(messages) => {
        let uid = messages.from.uid;
        let name = messages.from.name;
        logger.info(`脉脉 ${this.userInfo.name} 获取到 ${name} 的消息`);
        this.messageCache[uid] = messages;
    }

    noop = async() => {
        this.recallIndex = 0;
        while(global.running) {
            try {
                await this.doUnread();
            } catch (e) {
                logger.error(`boss ${this.userInfo.name} 处理未读消息异常: `, e);
                await sleep(5 * 1000);
            }

            let unreadNum = await this.hasUnread();
            if (unreadNum > 0)
                continue;

            try {
                await this.doRecall();
            } catch (e) {
                logger.error(`boss ${this.userInfo.name} 处理召回异常: `, e);
                await sleep(5 * 1000);
            }
        }
    }

    hasUnread = async() => {
        let [unreadSpan] = await this.page.$x(`//span[contains(@class, "menu-chat-badge")]/span[contains(@class, "unread-nums")]`);
        if (!unreadSpan)
            return 0;

        let unreadNum = await this.page.evaluate(node => node.innerText, unreadSpan);

        return unreadNum;
    }

    doUnread = async() => {
        let unreadNum = await this.hasUnread();
        if (unreadNum == 0)
            return;
        logger.info(`boss ${this.userInfo.name} 有 ${unreadNum} 个未读消息`);

        await this.setUnreadPage();
        await this.dealUnreadMsg();
        await this.setUnreadEnd();
    }

    dealUnreadMsg = async () => {
        let items = this.page.$x(`//div[contains(@class, "role")]`);
        let index = 0;
        while (index < items.length) {
            items = this.page.$x(`//div[contains(@class, "role")]`);
            let item = items[index];

            index += 1;
        }
    }

    dealOnePeople = async (item) => {
        let {id, name} = await this.fetchItemNameAndId(item);
        logger.info(`boss ${this.userInfo.name} 当前处理 ${id} ${name} 的消息`);
        await this.page.evaluate((item)=>item.scrollIntoView(), item);
        await item.click();
        await sleep(2 * 1000);

        let messages = await this.fetchPeopleMsgs(id);
        if (!messages) {
            logger.info(`boss ${this.userInfo.name} 当前处理 ${name} 异常,获取不到消息`);
            return;
        }

        await this.chatOnePeopleNoop(id, name, messages);
    }

    chatOnePeopleNoop = async (id, name, messages) => {
        while(!messages) {
            await this.dealSystemView();
            await this.chatWithRobot(id, name, messages);

            await sleep(10 * 1000);
            messages = await this.fetchMsgsByHtml();
        }
    }

    fetchMsgsByHtml = async () => {

    }

    fetchPeopleMsgs = async () => {
        
    }

    chatWithRobot = async (id, name, messages) => {
        logger.info(`boss ${this.userInfo.name} people: ${name} 历史消息: ${JSON.stringify(messages)} 准备跟AI聊天`);
        let nextStep, nextStepContent;

        try {
            let d = await this.chatToGpt(id, name, messages);
            nextStep = d.nextStep;
            nextStepContent = d.nextStepContent;
            logger.info(`脉脉 ${this.userInfo.name} ${name} nextStep: ${nextStep} nextStepContent: ${nextStepContent}`);

            if (nextStep.length == 0)
                return;

            await this.sendMessage(nextStepContent);

            if (nextStepContent.length === 0 && nextStep != "noTalk")
                await this.sendEmoji();

            if (nextStep === "need_contact") {
                await sleep(1000);
                try {
                    logger.info(`boss ${this.userInfo.name} ${name} 获取手机号`);
                    await this.sendContact(peopleInfo.name);
                } catch (e) {
                    logger.error(`boss ${this.userInfo.name} ${name} 申请手机号异常: ${e}`);
                }
            }
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} ${peopleInfo.name} 聊天发生异常: `, e);
        }
    }

    sendContact = async () => {
        let resumeBtn = await this.page.$x(`//span[contains(@class, "tip") and text() = "求简历"]/parent::*/span[contains(@class, "operate-btn")]`);
        await resumeBtn.click();
        await sleep(500);

        let wxBtn = await this.page.$x(`//span[contains(@class, "tip") and text() = "交换微信"]/parent::*/span[contains(@class, "operate-btn")]`);
        await wxBtn.click();
        await sleep(500);

        let phoneBtn = await this.page.$x(`//span[contains(@class, "tip") and text() = "交换手机"]/parent::*/span[contains(@class, "operate-btn")]`);
        await phoneBtn.click();
        await sleep(500);
    }

    sendEmoji = async () => {
        let emojiBtn = await this.page.$x(`//div[contains(@class, "biaoqing")]`);
        await emojiBtn.click();
        let emotionDiv = await this.waitElement(`//div[contains(@class, "emotion")]`);

        let emoji2Btn = await emotionDiv.$x(`//button[contains(@class, "emoji-2")]`);
        await emoji2Btn.click();
        await sleep(500);
    }

    sendMessage = async (msg) => {
        const msgList = msg.split('\n');
        logger.info(`boss ${this.userInfo.name} sendMessage: ${msgList}`);

        let [input] = await this.frame.$x('//div[contains(@id, "boss-chat-editor-input")]');

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

    sendContact = async (name) => {

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

        logger.info(`boss ${this.userInfo.name} chatToGpt data: ${JSON.stringify(data)}`);
  
        return new Promise((resolve, reject) => {
          if (data.ret != 0)
            reject({
              nextStep: "",
              nextStepContent: ""
            })
  
          resolve(data.data);
        });
    }

    dealSystemView = async () => {
        await this.dealResume();
        await this.dealWX();
        await this.dealPhone();
    }

    dealResume = async () => {

    }

    dealWX = async () => {

    }

    dealPhone = async () => {

    }

    fetchItemNameAndId = async(item) => {
        let nameSpan = await item.$x(`//span[contains(@class, "geek-name")]`);
        let name = await this.frame.evaluate(node => node.innerText, nameSpan);
        let idSpan = await item.$x(`//div[contains(@class, "geek-item")]`);
        let isStr = await this.frame.evaluate(node => node.dataset.id, idSpan);
        let id = isStr.split("-")[0];
        return {id, name};
    }

    putUnreadBtn = async () => {
        let [unreadBtn] = await this.page.$x(`//span[text() = "未读"]`);
        let [checkedBtn] = await this.frame.$x(`//span[text() = "未读"] and contains(@class, "active")]`);
        checked = !!checkedBtn;
        if (!checked) {
            await unreadBtn.click();
        }
    }

    putAllMessageBtn = async () => {
        let [allBtn] = await this.page.$x(`//span[text() = "全部"]`);
        let [checkedBtn] = await this.frame.$x(`//span[text() = "全部"] and contains(@class, "active")]`);
        checked = !!checkedBtn;
        if (!checked) {
            await allBtn.click();
        }
    }

    setUnreadPage = async() => {
        await this.putUnreadBtn();
    }

    setUnreadEnd = async() => {
        await this.putAllMessageBtn();
    }
}

module.exports = Chat;
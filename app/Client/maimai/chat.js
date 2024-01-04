const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const FormData = require('form-data');

class Chat extends Base {
    downloadDir = process.cwd();

    keywordDelay = 40;

    getPullMsgs;

    nowTime;

    recallErrorNum = 0;

    run = async() => {
        logger.info(`脉脉 ${this.userInfo.name} 聊天逻辑开始`);
        await this.setBefore();
        await this.noop();
        await this.setEnd();
    }

    noop = async() => {
        this.recallIndex = 0;
        this.beforeRecallAvactor = "";

        while(global.running) {
            try {
                await this.doUnread();
            } catch (e) {
                logger.error(`脉脉 ${this.userInfo.name} 处理未读消息异常: `, e);
                await sleep(5 * 1000);
            }

            let unreadNum = await this.hasUnread();
            if (unreadNum > 0)
                continue;

            try {
                await this.doRecall();
            } catch (e) {
                if (e.message.includes("Node is detached from document")) {
                    logger.info(`脉脉 ${this.userInfo.name} 出现special error, 召回item点不上的`);
                } else {
                    logger.error(`脉脉 ${this.userInfo.name} 处理召回异常: `, e);
                }
                await sleep(5 * 1000);
            }
        }
    }

    isSystemName = async(name) => {
        let systemNames = ["电话直联服务", "待处理请求", "脉脉官方服务", "招聘小助手", "待处理请求"]

        return systemNames.includes(name);
    }

    doUnread = async() => {
        let unreadNum = await this.hasUnread();
        if (unreadNum == 0)
            return;
        logger.info(`脉脉 ${this.userInfo.name} 有 ${unreadNum} 个未读消息`);

        await this.setUnreadPage();
        await this.dealUnreadMsg();
        await this.setUnreadEnd();
    }

    setUnreadEnd = async() => {
        await this.putUnreadBtn(false);
    }

    hasUnread = async() => {
        let [unreadSpan] = await this.page.$x(`//span[contains(@class, "unreadNum___2Vy9X")]`);
        if (!unreadSpan)
            return 0;

        let unreadNum = await this.page.evaluate(node => node.innerText, unreadSpan);
        if (unreadNum.includes("+")) {
            return 99;
        }

        return unreadNum;
    }

    setUnreadPage = async() => {
        await this.putUnreadBtn(true);
    }

    putUnreadBtn = async (flag) => {
        let [checkbox] = await this.frame.$x(`//span[contains(@class, "ant-checkbox")]`);
        let [checked] = await this.frame.$x(`//span[contains(@class, "ant-checkbox-checked")]`);
        let nowflag = !!checked;

        if (flag != nowflag) {
            await checkbox.click();
            await sleep(3 * 1000);
            return true;
        }

        return false;
    }

    dealUnreadMsg = async() => {
        let peopleIndex = 0;
        while(true) {
            await this.scrollChatToPosition(peopleIndex);
            await sleep(2 * 1000);

            let hasUnread = await this.dealOneUnread();
            if (!hasUnread) {
                let endFlag = await this.isUnreadEnd();
                if (endFlag)
                    break;
            }

            peopleIndex += 1;
        }
    }

    isUnreadEnd = async() => {
        let msgItems = await this.frame.$x(`//div[contains(@class, "message-item-normal")]`);
        for (let msgItem of msgItems) {
            let [badge] = await msgItem.$x(`//i[contains(@class, "message-badge")]`);
            if (badge)
                return false;
        }

        return true;
    }

    dealOneUnread = async() => {
        let msgItems = await this.frame.$x(`//div[contains(@class, "message-item-normal")]`);
        for (let msgItem of msgItems) {
            let [badge] = await msgItem.$x(`//i[contains(@class, "message-badge")]`);
            if (!badge)
                continue;

            let itemInfo = await this.fetchItemInfo(msgItem);
            let saySomethineFlag = await this.dealUnreadPeopleMsgs(itemInfo);
            while(saySomethineFlag) {
                await sleep(10 * 1000);
                saySomethineFlag = await this.dealUnreadPeopleMsgs(itemInfo);
            }

            return true;
        }

        return false;
    }

    fetchItemInfo = async(msgItem) => {
        let [imgElement] = await msgItem.$x(`//img[contains(@class, "message-avatar")]`);
        let [nameElement] = await msgItem.$x(`//h6[contains(@class, "message-user-name")]`);
        await nameElement.click();
        await sleep(1 * 1000);

        let name = await this.frame.evaluate(node => node.innerText, nameElement);
        let avator = await this.frame.evaluate(node => node.src, imgElement);
        logger.info(`脉脉 ${this.userInfo.name} 处理消息 name: ${name} avator: ${avator}`);
        let itemInfo = {
            name: name,
            avator: avator
        }

        return itemInfo;
    }

    dealUnreadPeopleMsgs = async(itemInfo) => {
        let name = itemInfo.name;
        let avator = itemInfo.avator;

        let isSystemFlag = await this.isSystemName(name);
        if (isSystemFlag)
            return false;
        
        let msgs = await this.fetchPeopleMsgs(name, avator);
        if (!msgs) {
            logger.info(`脉脉 ${this.userInfo.name} name: ${name} avator: ${avator} 没有获取到消息`);
            return false;
        }

        let peopleId = await this.fetchPeopleId(msgs);
        let peopleInfo = {id: peopleId, name: name, imgUrl: avator}
        logger.info(`脉脉 ${this.userInfo.name} 处理未读消息 peopleInfo: ${JSON.stringify(peopleInfo)}`);

        try {
            await this.dealSystemView(peopleInfo);
        } catch (e) {
            logger.error(`脉脉 ${this.userInfo.name} name: ${name} 处理系统信息异常: `, e);
        }

        await this.chatToPeople(peopleInfo, msgs);
        await this.fetchPeopleMsgs(name, avator);

        return true;
    }

    chatToPeople = async (peopleInfo, messages) => {
        let gptMessages = await this.transferMessages(messages);
        logger.info(`脉脉 ${this.userInfo.name} gptMessages: ${JSON.stringify(gptMessages)}`);
        if (gptMessages.length == 0 || gptMessages[gptMessages.length - 1].speaker == "robot") {
            logger.info(`脉脉 ${this.userInfo.name} 这个人 ${peopleInfo.name} ${peopleInfo.id} 没有未读消息`);
            return;
        }

        await this.chatWithRobot(gptMessages, peopleInfo);
    }

    chatWithRobot = async (messages, peopleInfo) => {
        logger.info(`脉脉 ${this.userInfo.name} people: ${JSON.stringify(peopleInfo)} 历史消息: ${JSON.stringify(messages)} 准备跟AI聊天`);
        let nextStep, nextStepContent;
        
        const {id, name} = peopleInfo;
        try {
            let d = await this.chatToGpt(id, name, messages);
            nextStep = d.nextStep;
            nextStepContent = d.nextStepContent;
            logger.info(`脉脉 ${this.userInfo.name} ${peopleInfo.name} nextStep: ${nextStep} nextStepContent: ${nextStepContent}`);

            if (nextStep.length == 0)
                return;

            await this.sendMessage(nextStepContent);

            if (nextStepContent.length === 0 && nextStep != "noTalk")
                await this.sendEmoji();

            if (nextStep === "need_contact") {
                await sleep(1000);
                try {
                    logger.info(`脉脉 ${this.userInfo.name} ${peopleInfo.name} 获取手机号`);
                    await this.sendPhone(peopleInfo.name);
                } catch (e) {
                    logger.error(`脉脉 ${this.userInfo.name} ${peopleInfo.name} 申请手机号异常: ${e}`);
                }
            }
        } catch (e) {
            logger.error(`脉脉 ${this.userInfo.name} ${peopleInfo.name} 聊天发生异常: `, e);
        }
    }

    chatToGpt = async(id, name, messages) => {
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

        logger.info(`脉脉 ${this.userInfo.name} chatToGpt data: ${JSON.stringify(data)}`);
  
        return new Promise((resolve, reject) => {
          if (data.ret != 0)
            reject({
              nextStep: "",
              nextStepContent: ""
            })
  
          resolve(data.data);
        });
    }

    sendPhone = async (name) => {
        await sleep(1000);
        let [phoneBtn] = await this.frame.$x(`//span[contains(@class, "tool-text") and (text() = "拨打电话" or text() = "申请中")]`);
        if (phoneBtn) {
            logger.info(`脉脉 ${this.userInfo.name} ${name} 已经有手机号或者在申请中`);
            return;
        }

        [phoneBtn] = await this.frame.$x(`//span[contains(@class, "tool-text") and text() = "交换手机"]`);
        if (!phoneBtn) {
            logger.info(`脉脉 ${this.userInfo.name} 聊天栏没有手机号按钮`);
            // await this.sendPhoneOld();
            return;
        }

        await phoneBtn.click();
    }

    //todo sendPhoneOld 需要跳转的简历不对
    sendPhoneOld = async () => {
        let [peopleDiv] = await this.frame.$x(`//i[contains(@class, "right-icon-single")]`);
        await peopleDiv.click();
        await sleep(1000);

        let [phoneBtn] = await this.frame.$x(`//span[text() = "申请交换手机号"]`);
        if (phoneBtn) {
            await phoneBtn.click();
        } else {
            logger.info(`脉脉 ${this.userInfo.name} 没有申请交换手机号的按钮, 可能还不是朋友`);
        }

        let [closeBtn] = await this.frame.$x(`//span[contains(@class, "right-browser-pannel-close")]`);
        await closeBtn.click();
        await sleep(500);
    }

    fetch

    transferMessages = async (messages) => {
        let res_messgaes = [];

        for (let message of messages) {
            if (message.status == 0)
                continue;

            if (message.type == 99) {
                if (message.text == "对方已与您交换手机号") {
                    res_messgaes.push({speaker: "system", msg: message.text, msgId: message.mid, time: message.crtimestamp});
                }
                continue;
            }

            if (message.type != 0)
                continue;

            let text = message.text;
            let usr_type;
            if (message.is_me == 1) {
                usr_type = "robot";
            } else {
                usr_type = "user";
            }

            if (text == "我已通过了好友请求，以后多交流～")
                usr_type = "system";

            if (text.includes("已同意交换手机号"))
                usr_type = "system";

            res_messgaes.push({speaker: usr_type, msg: text, msgId: message.mid, time: message.crtimestamp});
        }

        return res_messgaes;
    }

    dealSystemView = async (peopleInfo) => {
        await this.dealAgree();
        await this.fetchPhone(peopleInfo);
    }

    uploadPhoneNum = async (peopleInfo, phoneNum) => {
        const form = new FormData();  

        const reqParam = {accountID: this.userInfo.accountID, candidateID: peopleInfo.id, candidateName: peopleInfo.name}

        Object.keys(reqParam).map((key) => {
          form.append(key, reqParam[key]);
        });

        form.append("phone", phoneNum);
        form.append("jobID", "");

        await form.submit(`${BIZ_DOMAIN}/recruit/candidate/result/v2`, function(err, res) {
            if (err) {
                logger.error(`脉脉手机号上传失败error: `, err)
            }
            logger.info(`上传手机号成功`);
        });
    }

    fetchPhone = async (peopleInfo) => {
        logger.info(`脉脉 ${this.userInfo.name} ${peopleInfo.name} 准备获取电话号码`);
        try {
            let [phoneBtn] = await this.frame.$x(`//span[contains(@class, "tool-text") and text() = "拨打电话"]`);
            if (phoneBtn) {
                await phoneBtn.click();
                let phoneTxtdiv = await this.waitElement(`//p[contains(@class, "tool-title")]`, this.frame);
                let phoneTxt = await this.frame.evaluate(node => node.innerText, phoneTxtdiv);
                let phoneNum =  phoneTxt.split('•')[1];
                logger.info(`脉脉 ${this.userInfo.name} 候选人: ${peopleInfo.name} 电话号码: ${phoneNum}`);

                await this.uploadPhoneNum(peopleInfo, phoneNum);
                await sleep(1000);

                let [closeSpan] = await this.frame.$x(`//a[contains(@class, "confirm") and text() = "关闭"]`);
                await closeSpan.click();
            } 
        } catch (e) {
            logger.error(`脉脉 ${this.userInfo.name} 候选人: ${peopleInfo.name} 获取手机号异常: `, e);
        }
    }

    sendEmoji = async () => {
        let [emojiBtn] = await this.frame.$x(`//div[contains(@class, "dialogue-input-emoji")]`);
        await emojiBtn.click();
        await sleep(2 * 1000);

        let [hahaBtn] = await this.frame.$x(`//a[contains(@title, "[哈哈]")]`);
        await hahaBtn.click();
        await sleep(1000);

        await this.page.keyboard.down('Enter');
        await sleep(1000);
    }

    dealAgree = async () => {
        let [agreeBtn] = await this.frame.$x(`//span[text() = "同意"]`);
        if (!agreeBtn) {
            return
        }
        await agreeBtn.click();
        await sleep(1000);
    }

    sendMessage = async (msg) => {
        const msgList = msg.split('\n');
        logger.info(`脉脉 ${this.userInfo.name} sendMessage: ${msgList}`);

        let [input] = await this.frame.$x('//div[contains(@class, "inputPanel") and contains(@placeholder, "请输入信息")]');

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

    fetchPeopleId = async(msgs) => {
        for (let m of msgs) {
            if (m.mmid == "0")
                continue

            if (m.is_me == 1)
                continue

            let id = m.mmid;
            return id;
        }
    }

    fetchPeopleMsgs = async(name, avator) => {
        let msgs;

        if (name in this.NameMsgCache) {
            msgs = this.NameMsgCache[name];
            delete this.NameMsgCache[name];
        }

        if (avator in this.AvactarMsgCache) {
            msgs = this.AvactarMsgCache[avator];
            delete this.AvactarMsgCache[avator];
        }

        return msgs;
    }

    scrollChatToPosition = async(index) => {
        await this.frame.evaluate((scrollLength) => {
            const wrap = $(".virtualized-message-list")[0];
  
            wrap.scrollTo(0, scrollLength);
        }, 76 * index);
    }

    doRecall = async() => {
        await this.putUnreadBtn(false);
        await this.scrollChatToPosition(this.recallIndex);
        let item = await this.fetchRecallItem();
        if (!item) {
            logger.info(`脉脉 ${this.userInfo.name} 获取不到召回的item`);
            await sleep(1000);
            return;
        }
        await this.frame.evaluate((item)=>item.scrollIntoView(), item);

        let itemInfo = await this.fetchItemInfo(item);
        
        let msgs = await this.doRecallMsg(item, itemInfo);
        this.recallIndex += 1;
        this.beforeRecallAvactor = itemInfo.avator;

        await this.countRecallError(msgs);
        await this.dealRecallEnd(msgs);
    }

    countRecallError = async(msgs) => {
        if (!msgs) {
            this.recallErrorNum += 1;
            if (this.recallErrorNum > 10) {
                logger.info(`脉脉 ${this.userInfo.name} 召回获取消息异常超过10次`);
                await this.refreshChat();
            }
        } else {
            this.recallErrorNum = 0;
        }
    }

    refreshChat = async() => {
        this.recallIndex = 0;
        this.beforeRecallAvactor = "";
        await this.page.reload();
        await sleep(5000);
        const pageFrame = await this.page.$('#imIframe');
        this.frame = await pageFrame.contentFrame();
    }

    doRecallMsg = async(item, itemInfo) => {
        let name = itemInfo.name;
        let avator = itemInfo.avator;

        let isSystemFlag = await this.isSystemName(name);
        if (isSystemFlag)
            return;

        await item.click();
        await sleep(1 * 1000);

        let messages = await this.fetchPeopleMsgs(name, avator);
        if (!messages) {
            logger.info(`脉脉 ${this.userInfo.name} name: ${name} 没有获取到消息,出现异常`);
            return;
        }

        let peopleId = await this.fetchPeopleId(messages);
        let peopleInfo = {id: peopleId, name: name, imgUrl: avator};
        logger.info(`脉脉 ${this.userInfo.name} 候选人: ${peopleInfo.name} 召回`);

        let recallInfo = await this.needRecall(peopleInfo, messages);  
        if (!recallInfo)
            return messages;

        await this.sendMessage(recallInfo.recall_msg);
        await this.recallResult(peopleInfo.id);

        return messages;
    }

    dealRecallEnd = async (msgs) => {
        let f1 = await this.isOutTime(msgs);
        let f2 = await this.noMoreMsg();

        if (f1 || f2) {
            logger.info(`脉脉 ${this.userInfo.name} f1: ${f1} f2: ${f2}`);
            await this.refreshChat();
        }
    }

    noMoreMsg = async () => {
        let [noMoreDiv] = await this.page.$x(`//div[contains(@class, "message-nomore") and text() = "没有更多了"]`);
        return !!noMoreDiv
    }

    isOutTime = async (messages) => {
        if (!messages)
            return false;

        let lastTime = await this.fetchLastTimeByMessages(messages);
        if (!lastTime)
            return false;

        return this.nowTime - lastTime > 7 * 24 * 3600;
    }

    fetchLastTimeByMessages = async (messages) => {
        for (let i = messages.length - 1; i >= 0; i--) {
            let message = messages[i];
            return message.crtimestamp;
        }
    }

    recallResult = async (id) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/candidate/recallResult`,
            data: {
              accountID: this.userInfo.accountID,
              candidateID: id
            },
            headers: {"Connection": "keep-alive"},
            method: 'POST'
        });
        logger.info(`脉脉 ${this.userInfo.name} recallResult ${id} data: ${JSON.stringify(data)}`);
    }

    needRecall = async (peopleInfo, messages) => {
        let f = await this.fetchRead(messages);
        let readIDs = [];
        if (f) {
            readIDs.push(peopleInfo.id);
        }

        try {
            const { status, data } = await Request({
              url: `${BIZ_DOMAIN}/recruit/candidate/recallList`,
              data: {
                accountID: this.userInfo.accountID,
                candidateIDs: [peopleInfo.id],
                candidateIDs_read: readIDs
              },
              headers: {"Connection": "keep-alive"},
              method: 'POST'
            });
            logger.info(`脉脉 ${this.userInfo.name} name: ${peopleInfo.name} recall status: ${status} data: ${JSON.stringify(data)}`);

            if (status == 0) {
                let recallList = data;
                if (recallList.length > 0)
                    return recallList[0];
            }
        } catch (e) {
            logger.error(`脉脉 ${this.userInfo.name} name: ${peopleInfo.name} recallList request error: `, e);
        }
    }

    fetchRead = async (messages) => {
        let lastmsg = messages[messages.length - 1];
        let text = lastmsg.text;

        if (text.includes("已阅读您的消息")) {
            return true;
        }

        return false;
    }

    fetchRecallItem = async() => {
        let items = await this.frame.$x(`//div[contains(@class, "message-item-normal")]`);

        let next_item_index = 0;
        for (let index in items) {
            let item = items[index];
            let [imgElement] = await item.$x(`//img[contains(@class, "message-avatar")]`);
            let avactor = await this.frame.evaluate(node => node.src, imgElement);

            if (avactor == this.beforeRecallAvactor) {
                next_item_index = parseInt(index) + 1;
                break;
            }
        }

        if (this.beforeRecallAvactor.length == 0 || next_item_index >= items.length) {
            logger.info(`脉脉 ${this.userInfo.name} 召回找不到合适的item(${this.beforeRecallAvactor}), 重置到第一个节点。`);
            next_item_index = 0;
        }

        if (next_item_index >= 0 || next_item_index < items.length)
            return items[next_item_index];
    }

    setBefore = async() => {
        this.AvactarMsgCache = {};
        this.NameMsgCache = {};
        this.nowTime = new Date().getTime() / 1000;

        await this.setMsgReceive();
        await this.setChatPage();
    }

    setMsgReceive = async() => {
        this.getPullMsgs = async (response) => {
            const url = response.url();
            const request = response.request();
            const method = request.method();

            if (url.startsWith('https://maimai.cn/groundhog/msg/v5/pull_msg') &&
                response.status() === 200 && (['GET', 'POST'].includes(method))) {
                try {
                    let res = await response.json();
                    if (res.result && res.result == "ok") {
                        if (!res.messages || res.messages.length == 0) {
                            return
                        }
                        await this.dealPullMsg(res.messages);
                    }
                } catch (e) {
                    logger.error(`脉脉 ${this.userInfo.name} 获取聊天pull_msg异常: ${url}:`, e);
                }
            }

            if (url.startsWith('https://maimai.cn/groundhog/msg/v5/get_dlg?u=') &&
            response.status() === 200 && (['GET', 'POST'].includes(method))) {
                try {
                    let res = await response.json();
                
                    if (res.result && res.result == "ok") {
                        if (!res.dialogues || res.dialogues.length == 0) {
                            return
                        }
                        await this.dealGetDlg(res.dialogues);
                    }
                } catch (e) {
                    logger.error(`脉脉 ${this.userInfo.name} 获取聊天get_dlg异常: ${url}:`, e);
                }
            }
        }
        this.page.on('response', this.getPullMsgs);
    }

    dealPullMsg = async(messages) => {
        for (let messageInfo of messages) {
            let userCard = messageInfo.u2;
            let avater = userCard.avatar;
            let name = userCard.name;

            logger.info(`脉脉 ${this.userInfo.name} 候选人 ${name} avater: ${avater} 通过pull_msg获取到消息`);
            this.AvactarMsgCache[avater] = messageInfo.latest_dialogs;
        }
    }

    dealGetDlg = async(dialogues) => {
        let name;
        for (let message of dialogues) {
            if (message.is_me != 0)
                continue;

            if (message.business_type != 1114)
                continue

            if (!message.common_card)
                continue;

            name = message.common_card.center.title
        }
        if (!name)
            return;

        logger.info(`脉脉 ${this.userInfo.name} 候选人 ${name} 通过get_dlg获取到消息`);
        this.NameMsgCache[name] = dialogues;
    }

    setChatPage = async() => {
        let [homeBtn] = await this.page.$x(`//div[text() = "首页"]`);
        await homeBtn.click();
        await sleep(1000);
        let [msgBtn] = await this.page.$x(`//div[text() = "消息"]`);
        await msgBtn.click();
        await sleep(1000);

        await this.waitElement(`//iframe[contains(@id, "imIframe")]`, this.page, 50);

        const pageFrame = await this.page.$('#imIframe');
        this.frame = await pageFrame.contentFrame();

        let allBtn = await this.waitElement(`//div[text() = "全部"]`, this.frame);
        await allBtn.click();
        await this.waitElement(`//div[contains(@class, "message-list")]`, this.page);
    }

    setEnd = async() => {
        await this.page.removeListener('response', this.getPullMsgs);
    }
}

module.exports = Chat;
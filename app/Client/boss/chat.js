const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");
const FormData = require('form-data');
const path = require('path');
const {rmDir} = require('../../utils/FileSystem');
const fs = require('fs');

class Chat extends Base {
    keywordDelay = 40;
    messageCache = {};
    recallIndex = 0;
    itemHeight = 78;

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
        await this.setDownloadPath();
    }

    setChatPage = async() => {
        // let [jobManageBtn] = await this.page.$x(`//a[contains(@ka, "menu-manager-job")]`);
        // await jobManageBtn.click();
        // await sleep(500);

        let [chatBtn] = await this.page.$x(`//a[contains(@ka, "menu-im")]`);
        await chatBtn.click();
        await sleep(500);

        await this.waitElement(`//div[contains(@class, "chat-box")]`, this.page);
    }

    setMsgReceive = async() => {
        const getPeopleMessage = async (response) => {
            const url = response.url();
            if (url.startsWith('https://www.zhipin.com/wapi/zpchat/boss/historyMsg')) {

              try {
                const itemRes = await response.json();
    
                let messages = itemRes.zpData.messages;
                await this.dealPeopleMessage(messages);
              } catch (e) {
                logger.error(`boss ${this.userInfo.name} 获取消息error: `, e);
              }
            }
        }

        this.page.on('response', getPeopleMessage);
    }

    dealPeopleMessage = async(messages) => {
        let uid = messages[0].from.uid;
        let name = messages[0].from.name;
        logger.info(`boss ${this.userInfo.name} 获取到 ${name} 的消息`);
        this.messageCache[uid] = messages;
    }

    noop = async() => {
        let unreadNum = await this.hasUnread();
        while (unreadNum > 0) {
            try {
                await this.doUnread();
            } catch (e) {
                logger.error(`boss ${this.userInfo.name} 处理未读消息异常: `, e);
                await sleep(5 * 1000);
            }
            await sleep(5 * 1000);
            unreadNum = await this.hasUnread();
        }

        try {
            await this.doRecall();
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} 处理召回异常: `, e);
            await sleep(5 * 1000);
        }
    }

    doRecall = async() => {
        await this.putAllMessageBtn();
        await this.dealRecallEnd();
        await this.scrollChatToPosition(this.recallIndex);
        let item = await this.fetchRecallItem();
        await this.page.evaluate((item)=>item.scrollIntoView({ block: "center" }), item);
        let {id, name} = await this.fetchItemNameAndId(item);

        let recallInfo = await this.needRecall(id, name);
        this.recallIndex += 1;
        if (!recallInfo)
            return;
        await item.click();
        await sleep(500);

        await this.sendMessage(recallInfo.recall_msg);
        await this.recallResult(id);

        await this.dealRecallEnd();
    }

    scrollChatToPosition = async(index) => {
        await this.page.evaluate((scrollLength) => {
            const wrap = $(".user-list")[0];
            wrap.scrollBy(0, scrollLength);
        }, this.itemHeight * index);
    }

    fetchRecallItem = async() => {
        let items = await this.page.$x(`//div[contains(@role, "listitem")]`);
        return items[this.recallIndex];
    }

    dealRecallEnd = async() => {
        let items = await this.page.$x(`//div[contains(@role, "listitem")]`);
        if (this.recallIndex >= items.length) {
            this.recallIndex = 0;
        }
    }

    needRecall = async(id, name) => {
        try {
            const { status, data } = await Request({
              url: `${BIZ_DOMAIN}/recruit/candidate/recallList`,
              data: {
                accountID: this.userInfo.accountID,
                candidateIDs: [id],
                candidateIDs_read: []
              },
              headers: {"Connection": "keep-alive"},
              method: 'POST'
            });
            logger.info(`boss ${this.userInfo.name} name: ${name} recall status: ${status} data: ${JSON.stringify(data)}`);

            if (status == 0) {
                let recallList = data;
                if (recallList.length > 0)
                    return recallList[0];
            }
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} name: ${name} recallList request error: `, e);
        }
    }

    recallResult = async(id) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/candidate/recallResult`,
            data: {
              accountID: this.userInfo.accountID,
              candidateID: id
            },
            headers: {"Connection": "keep-alive"},
            method: 'POST'
        });
        logger.info(`boss ${this.userInfo.name} recallResult ${id} data: ${JSON.stringify(data)}`);
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
        let items = await this.page.$x(`//div[contains(@role, "listitem")]`);
        logger.info(`boss ${this.userInfo.name} 获取到 ${items.length} 个未读item`);
        let index = 0;
        while (index < items.length) {
            items = await this.page.$x(`//div[contains(@role, "listitem")]`);
            let item = items[index];
            await this.scrollChatToPosition(index);

            try {
                await this.dealOnePeople(item);
            } catch (e) {
                logger.error(`boss ${this.userInfo.name} 处理未读消息出现异常: `, e);
            }

            index += 1;
        }
    }

    dealOnePeople = async (item) => {
        let {id, name} = await this.fetchItemNameAndId(item);
        logger.info(`boss ${this.userInfo.name} 当前处理 ${id} ${name} 的消息`);
        await this.page.evaluate((item)=>item.scrollIntoView(), item);
        await item.click();
        await sleep(2 * 1000);

        let messages = await this.fetchPeopleMsgsByCache(id);
        logger.info(`boss ${this.userInfo.name} id: ${id} http请求处理后的消息: ${JSON.stringify(messages)}`);
        if (!messages) {
            logger.info(`boss ${this.userInfo.name} 当前处理 ${name} 异常, http获取不到消息`);
            messages = await this.fetchMsgsByHtml(name);
        }

        await this.chatOnePeopleNoop(id, name, messages);
    }

    chatOnePeopleNoop = async (id, name, messages) => {
        await this.dealSystemView(id, name);
        while(messages && messages.length > 0) {
            let needTalk = await this.needTalk(messages);
            if (!needTalk)
                break;
            
            await this.chatWithRobot(id, name, messages);
            
            await sleep(10 * 1000);
            await this.dealSystemView(id, name);
            messages = await this.fetchMsgsByHtml(name);
        }
    }

    needTalk = async (messages) => {
        if (messages.length == 0)
            return false;

        if (messages[messages.length - 1].speaker == "robot")
            return false;

        return true;
    }

    fetchMsgsByHtml = async (name) => {
        let messages = [];
        let msgItems = await this.page.$x(`//div[contains(@class, "chat-message-list")]/div[contains(@class, "message-item")]`);
        for (let msgItem of msgItems) {
            let {speaker, txt} = await this.fetchItemMsg(msgItem, name);
            if (!txt || txt.length == 0)
                continue;

            messages.push({
                speaker: speaker,
                msg: txt
            });
        }
        logger.info(`boss ${this.userInfo.name} name: ${name} html处理后的消息: ${JSON.stringify(messages)}`);

        return messages;
    }

    fetchItemMsg = async (msgItem, name) => {
        let [txtSpan] = await msgItem.$x(`//div[contains(@class, "text")]/span`);
        if (!txtSpan)
            return {speaker: "system", txt: ""};

        let txt = await this.page.evaluate(node => node.innerText, txtSpan);

        let speaker = "system";
        let [friendSpan] = await msgItem.$x(`//div[contains(@class, "item-friend")]`);
        if (friendSpan)
            speaker = "user";
        let [robotSpan] = await msgItem.$x(`//div[contains(@class, "item-myself")]`);
        if (robotSpan)
            speaker = "robot";        

        let systemTxt= await this.isSystemSpeakerTxt(txt, name);
        if (systemTxt)
            speaker = "system";
        return {speaker, txt};
    }

    fetchPeopleMsgsByCache = async (id) => {
        let messagesRaw = this.messageCache[id];
        if (!messagesRaw)
            return;
        delete this.messageCache[id];

        let messages = [];
        for (let messageRaw of messagesRaw) {
            let txt = await this.fetchTxt(messageRaw);
            if (!txt)
                continue;

            let speaker = await this.fetchSpeaker(messageRaw, txt);
            let noUse = await this.isNoUserMsg(messageRaw, txt);
            if (noUse)
                continue;

            messages.push({
                speaker: speaker,
                msg: txt,
                time: messageRaw.time
            });
        }
        return messages;
    }

    fetchTxt = async(message) => {
        const pushText = message.pushText;
        if (!pushText)
            return;

        let ts = pushText.split(":");
        return ts[1];
    }

    fetchSpeaker = async (message, txt) => {
        const pushText = message.pushText;
        let ts = pushText.split(":");
        let userName = ts[0];
        let system = await this.isSystemSpeakerTxt(txt, userName);
        if (system)
            return "system";

        if (userName == this.userInfo.name)
            return "robot";

        return "user"
    }

    isSystemSpeakerTxt = async(txt, userName) => {
        let specialTxts = ["我想要和您交换联系方式，您是否同意", "我想要和您交换微信，您是否同意", "对方想发送附件简历给您，您是否同意", userName + "的微信号", "您可至邮箱中查看和下载", "接受与您交换微信", "接受与您交换联系方式", "对方拒绝了您的交换微信请求"]
        for (let specialTxt of specialTxts) {
            if (txt.includes(specialTxt))
                return "system";
        }
        return;
    }

    isNoUserMsg = async (message, txt) => {
        if (message.uncount === 1)
            return true;

        if (message.status !== 2 && message.status !== 1)
            return true;

        if (message.body.templateId === 3)
            return true;

        if (txt.match("发来一张图片"))
            return true;

        return false;
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
                    logger.info(`boss ${this.userInfo.name} ${name} 获取联系方式`);
                    await this.sendContact(name);
                } catch (e) {
                    logger.error(`boss ${this.userInfo.name} ${name} 申请手机号异常: `, e);
                }
            }
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} ${name} 聊天发生异常: `, e);
        }
    }

    sendContact = async () => {
        let [resumeBtn] = await this.page.$x(`//span[contains(@class, "tip") and text() = "求简历"]/parent::*/span[contains(@class, "operate-btn")]`);
        logger.info(`boss ${this.userInfo.name} 简历按钮: `, resumeBtn);
        await resumeBtn.click();
        await sleep(500);

        let [wxBtn] = await this.page.$x(`//span[contains(@class, "tip") and text() = "交换微信"]/parent::*/span[contains(@class, "operate-btn")]`);
        logger.info(`boss ${this.userInfo.name} wx按钮: `, wxBtn);
        if (wxBtn) {
            await wxBtn.click();
            await sleep(500);
        }

        let [phoneBtn] = await this.page.$x(`//span[contains(@class, "tip") and text() = "交换手机"]/parent::*/span[contains(@class, "operate-btn")]`);
        logger.info(`boss ${this.userInfo.name} 电话按钮: `, phoneBtn);
        if (phoneBtn) {
            await phoneBtn.click();
            await sleep(500);
        }
    }

    sendEmoji = async () => {
        let [emojiBtn] = await this.page.$x(`//div[contains(@class, "biaoqing")]`);
        await emojiBtn.click();
        let emotionDiv = await this.waitElement(`//div[contains(@class, "emotion")]`, this.page);

        let [emoji2Btn] = await emotionDiv.$x(`//button[contains(@class, "emoji-2")]`);
        await emoji2Btn.click();
        await sleep(500);
    }

    sendMessage = async (msg) => {
        const msgList = msg.split('\n');
        logger.info(`boss ${this.userInfo.name} sendMessage: ${msgList}`);

        let [input] = await this.page.$x('//div[contains(@id, "boss-chat-editor-input")]');

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

    dealSystemView = async (id, name) => {
        await this.clickOkAll();
        await this.dealSystemResume(id, name);
        await this.dealWX(id, name);
        await this.dealPhone(id, name);
    }

    clickOkAll = async () => {
        let agreeBtns = await this.page.$x(`//span[contains(@class, "card-btn") and text()="同意" and not(contains(@class,'disable'))]`);
        for (let agreeBtn of agreeBtns) {
            await agreeBtn.click();
            await sleep(500);
          }
    }

    dealSystemResume = async (id, name) => {
        let items = await this.page.$x(`//div[contains(@class, "message-item")]`);
        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            let [robotSpan] = await item.$x(`//div[contains(@class, "item-myself")]`);
            if (robotSpan)
                break;

            let [cardBtn] = await item.$x(`//span[contains(@class, "card-btn")]`);
            if (!cardBtn)
                continue;

            let btnTxt = await this.page.evaluate(node => node.innerText, cardBtn);

            if (btnTxt == "点击预览附件简历")
                await this.dealResume(item, id, name);
        }
    }

    dealResume = async (item, id, name) => {
        await this.makeDownloadDir();
        await this.downloadResume(item);
        await this.uploadResume(id, name);
        await this.clearDownloadDir();
    }

    downloadResume = async(item) => {
        await this.page.evaluate((item)=>item.scrollIntoView(), item);
        let [showBtn] = await item.$x(`//span[text() = "点击预览附件简历"]`);
        await showBtn.click();
        await sleep(3 * 1000);

        let resumeFrame = await this.waitElement(`//div[contains(@class, "resume-common-dialog")]`, this.page);

        // const pageFrame = await this.page.$('#imIframe');
        // let resumeFrame = await pageFrame.contentFrame();
        let btns = await resumeFrame.$x(`//div[contains(@class, "attachment-resume-btns")]/span`);
        await btns[btns.length - 1].click();
        await sleep(1 * 1000);
        let [closeBtn] = await resumeFrame.$x(`//div[contains(@class, "boss-popup__close")]`);
        await closeBtn.click();
        await sleep(1 * 1000);
    }

    uploadResume = async(id, name) => {
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
  
        await form.submit(`${BIZ_DOMAIN}/recruit/candidate/result`, function(err, res) {
            if (err) {
                logger.error(`简历上传失败error: `, err)
            }
        });
        await sleep(2 * 1000);
    }

    makeDownloadDir = async() => {
        let dirPath = path.join(process.cwd(), this.userInfo.accountID.toString());
        logger.info(`boss ${this.userInfo.name} 下载路径: `, dirPath);
        try {
          await rmDir(dirPath);
          fs.mkdir(dirPath,(err)=>{
            if(err){
              logger.error(`boss ${this.userInfo.name} 新建目录出错:`, err);
            }
          })
        } catch(e) {
          logger.error(`boss ${this.userInfo.name} 新建目录出错:`, e);
        }
    }

    clearDownloadDir = async() => {
        let dirPath = path.join(process.cwd(), this.userInfo.accountID.toString());
        try {
            await rmDir(dirPath);
        } catch(e) {
            logger.error(`boss ${this.userInfo.name} 清理目录出错:`, e);
        }
    }

    dealWX = async (id, name) => {
        let [wxBtn] = await this.page.$x(`//span[contains(@class, "operate-btn") and text() = "查看微信"]`);
        if (!wxBtn) {
            return;
        }
        await wxBtn.click();
        let exchangeDiv = await this.waitElement(`//div[contains(@class, "exchange-tooltip") and not(contains(@style, "display: none;"))]`, this.page);
        let [textExchangeDiv] = await exchangeDiv.$x(`//span[contains(@class, "text exchanged")]/span`);
        let wx = await this.page.evaluate(node => node.innerText, textExchangeDiv);
        logger.info(`boss ${this.userInfo.name} 获取到 ${name} 的微信: ${wx}`);

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

        form.submit(`${BIZ_DOMAIN}/recruit/candidate/result`, function(err) {
            if (err) {
              logger.error(`微信上传失败error: `, e)
            }
        });
        await sleep(500);

        let [closeBtn] = await exchangeDiv.$x(`//span[text() = "取消"]`);
        await closeBtn.click();
    }

    dealPhone = async (id, name) => {
        let [phoneBtn] = await this.page.$x(`//span[contains(@class, "operate-btn") and text() = "查看电话"]`);
        if (!phoneBtn) {
            return;
        }
        await phoneBtn.click();
        let exchangeDiv = await this.waitElement(`//div[contains(@class, "exchange-tooltip") and not(contains(@style, "display: none;"))]`, this.page);
        let [textExchangeDiv] = await exchangeDiv.$x(`//span[contains(@class, "text exchanged")]/span`);
        let phone = await this.page.evaluate(node => node.innerText, textExchangeDiv);
        logger.info(`boss ${this.userInfo.name} 获取到 ${name} 的电话: ${phone}`);

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

        form.submit(`${BIZ_DOMAIN}/recruit/candidate/result`, function(err) {
            if (err) {
              logger.error(`手机号上传失败error: `, e)
            }
        });
        await sleep(500);

        let [closeBtn] = await exchangeDiv.$x(`//span[text() = "取消"]`);
        await closeBtn.click();
    }

    fetchItemNameAndId = async(item) => {
        let [nameSpan] = await item.$x(`//span[contains(@class, "geek-name")]`);
        let name = await this.page.evaluate(node => node.innerText, nameSpan);
        // let [idSpan] = await item.$x(`//div[contains(@class, "geek-item")]`);
        const isStr = await this.page.evaluate((el) => el.getAttribute('key'), item);
        // let isStr = await this.page.evaluate(node => node.key, item);
        let id = isStr.split("-")[0];

        logger.info(`boss ${this.userInfo.name} 获取到 id: ${id} name: ${name}`);
        return {id, name};
    }

    putUnreadBtn = async () => {
        let [unreadBtn] = await this.page.$x(`//span[text() = "未读"]`);
        let [checkedBtn] = await this.page.$x(`//span[text() = "未读" and contains(@class, "active")]`);
        let checked = !!checkedBtn;
        if (!checked) {
            await unreadBtn.click();
        }
    }

    putAllMessageBtn = async () => {
        let [allBtn] = await this.page.$x(`//span[text() = "全部"]`);
        let [checkedBtn] = await this.page.$x(`//span[text() = "全部" and contains(@class, "active")]`);
        let checked = !!checkedBtn;
        if (!checked) {
            await allBtn.click();
        }
    }

    setUnreadPage = async() => {
        await this.putUnreadBtn();
        await sleep(1000);
    }

    setUnreadEnd = async() => {
        let [allBtn] = await this.page.$x(`//div[contains(@title, "全部")]`);
        await allBtn.click();
        await sleep(500);

        await this.putAllMessageBtn();
        await sleep(1000);
    }
}

module.exports = Chat;
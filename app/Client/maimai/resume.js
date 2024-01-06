const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");


class Resume extends Base {
    keywordDelay = 40;
    peopleCache;
    getList;

    constructor(options) {
        super(options)
    }

    queryTasks = async() => {
        const {status, data, msg} = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/fetch/v2`,
            data: {
                accountID: this.userInfo.accountID,
            },
            method: 'POST'
          });
        logger.info(`脉脉 ${this.userInfo.name} 领取到任务: ${JSON.stringify(data)}`);

        return data["task"];
    }

    run = async() => {
        logger.info(`脉脉 ${this.userInfo.name} 打招呼，开始执行任务`);
        let tasks = await this.queryTasks();
        logger.info(`脉脉 ${this.userInfo.name} 获取到 ${tasks.length} 个任务, 任务如下: ${JSON.stringify(tasks)}`);

        this.hiEnd = false;
        this.friendEnd = false;
        await this.checkEnd();

        for (let index in tasks) {
            if (this.hiEnd && this.friendEnd)
                break;

            let task = tasks[index];

            if (task.helloSum <= 0) {
                logger.info(`脉脉 ${this.userInfo.name} 任务 ${parseInt(index) + 1} 已经完成`);
                continue;
            }
    
            logger.info(`脉脉 ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个任务`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`脉脉 ${this.userInfo.name} 任务 ${parseInt(index) + 1} 出现异常失败: `, e)
            }
        }
    }

    dealTask = async(task) => {
        await this.dealTaskBefore();
        await this.setFilter(task);
        let noPeople = await this.isNoPeople();
        if (!noPeople)
            await this.noopTask(task);
        await this.dealTaskAfter();
    }

    isNoPeople = async() => {
        let [noPeopleSpan] = await this.page.$x(`//span[text() = "暂无匹配人才，为您推荐以下人才"]`);
        logger.info(`脉脉 ${this.userInfo.name} 没有人`);
        return !!noPeopleSpan;
    }

    dealTaskBefore = async() => {
        this.getList = async (response) => {
            try {
              const url = response.url();
              const request = response.request();
              const method = request.method();
  
              if (url.startsWith('https://maimai.cn/api/ent/v3/search/basic?channel=') &&
                response.status() === 200 && (['GET', 'POST'].includes(method))) {
                  let res;
                  try {
                      res = await response.json();
                  } catch (e) {
                      logger.error(`maimai ${this.userInfo.name} 监听获取列表数据异常：`, e);
                  }
  
                  if (res.code == 0 && res.data) {
                      this.peopleCache = res.data.list;
                      logger.info(`maimai ${this.userInfo.name} get peopleCache: ${this.peopleCache.length}`);
                  }
              }
           } catch (e) {
              logger.error(`maimai ${this.userInfo.name} get candidate list error: ${e}`);
           }
        }
        this.page.on('response', this.getList);
    }

    dealTaskAfter = async() => {
        this.page.removeListener('response', this.getList);
    }

    setFilter = async(task) => {
        await this.refresh();
        await this.clearBuble();

        await this.setSearchTxt(task);
        await this.setLocation(task);
        await this.setEducation(task);
        await this.setWorkTime(task);
        await this.setIndustry(task);
        await this.setActiveInfo();
        await this.setReSetPosition();

        await this.clearBuble();
    }

    clearBuble = async() => {
        await this.page.$$eval('.mui-btn', ns => {
            for (let n of ns) {
                if (n.innerText == "我知道了") {
                    n.click();
                }
            }
        })
    }

    setActiveInfo = async() => {
        let checkBtn1 = await this.waitElement(`//span[text() = "近期未查看" and not(@disabled)]`, this.page);
        await this.page.evaluate((item)=>item.scrollIntoView(), checkBtn1);
        await checkBtn1.click();
        await this.waitListRefresh();

        let checkBtn2 = await this.waitElement(`//span[text() = "近期未沟通" and not(@disabled)]`, this.page);
        await this.page.evaluate((item)=>item.scrollIntoView(), checkBtn2);
        await checkBtn2.click();
        await this.waitListRefresh();
    }

    setIndustry = async(task) => {
        let industrys = task.filter.industry;
        if (!industrys || industrys.length == 0)
            return

        let industrySpan = await this.waitElement(`//span[contains(@class, "title___2V3Fl") and text() = "行业方向"]`, this.page);
        await industrySpan.click();
        await sleep(200);
        await this.waitElement(`//div[contains(@class, "ant-modal-body")]`, this.page);

        for (let industry of industrys) {
            let [clearBtn] = await this.page.$x(`//div[contains(@class, "searchWrapper___eaY34")]//span[contains(@class, "ant-input-clear-icon") and not(contains(@class, "ant-input-clear-icon-hidden"))]//span[contains(@aria-label, "close-circle")]`);
            if (clearBtn)
                clearBtn.click();
            await sleep(200);

            let [industryInput] = await this.page.$x(`//input[contains(@class, "ant-input") and contains(@placeholder, "搜索行业方向")]`);
            await industryInput.click();
            await this.page.keyboard.type(industry, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
            await this.waitElement(`//div[contains(@class, "searchResultCard___2dROs")]`, this.page);

            let items = await this.page.$x(`//div[contains(@class, "searchResultItem___6ZslB")]`);
            if (items.length == 0)
                continue

            await items[0].click();
            await sleep(200);
        }

        let [clearBtn] = await this.page.$x(`//div[contains(@class, "searchWrapper___eaY34")]//span[contains(@class, "ant-input-clear-icon") and not(contains(@class, "ant-input-clear-icon-hidden"))]//span[contains(@aria-label, "close-circle")]`);
        if (clearBtn)
            clearBtn.click();

        await sleep(500);
        let [sureBtn] = await this.page.$x(`//div[contains(@class, "mui-btn") and text() = "确 定"]`);
        await sureBtn.click();
        await sleep(500);

        await this.waitListRefresh();

        await this.setReSetPosition();
    }

    setSearchTxt = async(task) => {
        let inputText = await this.waitElement(`//input[contains(@placeholder, "按职位/公司/学校/专业等条件搜索人才") and contains(@class, "ant-input")]`, this.page);
        await inputText.click();
        await sleep(300);

        let searchTxt = task.filter.search_text;
        console.log(searchTxt);
        await this.page.keyboard.type(searchTxt, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        await this.page.keyboard.press('Enter');

        await this.waitListRefresh();
    }

    setLocation = async(task) => {
        if (!task.filter.location || task.filter.location.length == 0)
            return;

        let cityBtn = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "城市地区"]`, this.page);
        await cityBtn.click();
        await sleep(300);

        await this.waitElement(`//div[contains(@class, "wrapper___3L7wg")]`, this.page);

        for (let location of task.filter.location) {
            let [clearBtn] = await this.page.$x(`//div[contains(@class, "search-input___287ix")]//span[contains(@aria-label, "close-circle")]`);
            if (clearBtn) {
                await clearBtn.click();
                await sleep(200);
            }

            let inputText = await this.waitElement(`//input[contains(@class, "ant-input") and contains(@placeholder, "请输入城市地区")]`, this.page);
            await inputText.type(location);
            await sleep(1000);

            let selects = await this.waitElements(`//li[contains(@class, "option___nxmry")]`, this.page, 4);
            if (selects.length > 0) {
                await selects[0].click();
            }
            await sleep(1000);
        }

        await this.waitListRefresh();

        await this.setReSetPosition();
    }

    setEducation = async(task) => {
        let education = task.filter.education;
        if (!education)
            return;

        let educationBtn = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "学历要求"]`, this.page);
        await educationBtn.click();
        await sleep(1000);

        let educationSpan = await this.waitElement(`//div[contains(@class, "content___6LPBl") and text() = "${education}"]`, this.page);
        if (educationSpan) 
            await educationSpan.click();

        await this.waitListRefresh();

        await this.setReSetPosition();
    }

    setWorkTime = async(task) => {
        let beginTime = task.filter.min_work_year;
        let endTime = task.filter.max_work_year;
        if (!beginTime || !endTime)
            return;

        if (beginTime > 20 || endTime > 20) {
            logger.info(`maimai ${this.userInfo.name} 开始结束年限异常 beginTime: ${beginTime} endTime: ${endTime}`);
            return
        }

        let workTimeSpan = await this.waitElement(`//span[contains(@class, "title___1mftG") and text() = "工作年限"]`, this.page);
        await workTimeSpan.click();
        await sleep(500);

        await this.waitElement(`//div[contains(@class, "wrapper___3L7wg")]`, this.page);

        let [leftBtn] = await this.page.$x(`//span[contains(@class, "mui-select-selection-search")]/input[contains(@id, "rc_select_2")]`);
        await this.setWorkTimeDrop(leftBtn, beginTime);
        
        let [rightBtn] = await this.page.$x(`//span[contains(@class, "mui-select-selection-search")]/input[contains(@id, "rc_select_3")]`);
        await this.setWorkTimeDrop(rightBtn, endTime);

        let [sureBtn] = await this.page.$x(`//div[contains(@class, "mui-btn") and text() = "确定"]`);
        await sureBtn.click();
    
        await this.waitListRefresh();

        await this.setReSetPosition();
    }

    setReSetPosition = async() => {
        let [titleSpan] = await this.page.$x(`//span[text() = "搜索条件"]`);
        await this.page.evaluate((item)=>item.scrollIntoView(), titleSpan);
        await sleep(200);
        await titleSpan.click();
        await sleep(300);
    }

    setWorkTimeDrop = async(btn, timeNum) => {
        await btn.click();
        let mainDiv = await this.waitElement('//div[contains(@class, "mui-select-dropdown-rtl") and not(contains(@class, "mui-select-dropdown-hidden"))]', this.page);

        let timeTxt = timeNum + "年";
        let [timeBtn] = await this.page.$x(`//div[contains(@class, "mui-select-item-option-content") and text() = "${timeTxt}"]`);
        while(!timeBtn) {
            await this.page.$$eval(`div.mui-select-dropdown-rtl:not(.mui-select-dropdown-hidden) .mui-select-item-option-content`, ns => {
                ns[ns.length - 1].scrollIntoView();
            });
            await sleep(500);
            [timeBtn] = await this.page.$x(`//div[contains(@class, "mui-select-item-option-content") and text() = "${timeTxt}"]`);
        }

        await sleep(300);

        await this.page.$$eval(`div.mui-select-dropdown-rtl:not(.mui-select-dropdown-hidden) .mui-select-item-option-content`, (ns, timeTxt) => {
            for (let n of ns) {
                if (n.innerText == timeTxt)
                    n.click();
            }
        }, timeTxt)
        await sleep(200);
    }

    waitPeopleNum = async() => {
        let peopleNumSpan = await this.waitElement(`//div[contains(@class, "items-end")]/span[contains(@class, "white-space-nowrap")]`, this.page, 5);
        if (!peopleNumSpan) {
            logger.info(`脉脉 ${this.userInfo.name} 已经没有人了`);
            return;
        }

        let txt = await this.page.evaluate(node => node.textContent, peopleNumSpan);
        logger.info(`脉脉 ${this.userInfo.name} 搜集人数 ${txt}`);
    }

    waitListRefresh = async() => {
        await sleep(500);
        let cardSpan = await this.waitElement(`//div[contains(@class, "talent-common-card")]`, this.page);
        if (!cardSpan) {
            logger.info(`列表没有出现`);
            return;
        }
    }

    refresh = async() => {
        let homeBtn = await this.waitElement('//div[text() = "首页"]', this.page);
        await homeBtn.click();
        await sleep(200);

        let recruiterBtn = await this.waitElement('//div[text() = "招人"]', this.page);
        await recruiterBtn.click();
        await sleep(200);

        let searchBtn = await this.waitElement(`//div[contains(@class, "tabContent___3rPz3") and text() = "搜索"]`, this.page);
        await searchBtn.click();
        await sleep(200);
    }

    noopTask = async(task) => {
        let page = 1;
        while(true) {
            if (this.friendEnd && this.hiEnd)
                break;

            if (task.helloSum <= 0) {
                logger.info(`脉脉 ${this.userInfo.name} 今天的指标已经用完`);
                break;
            }

            logger.info(`脉脉 ${this.userInfo.name} 当前任务处理到第 ${page} 页`);
            await this.dealPeople(task);
    
            let hasNext = await this.nextPage();
            if (!hasNext)
                break;

            page += 1;
            if (!global.running)
                return;
        }
    }

    checkEnd = async() => {
        let AccountInfoSpans = await this.page.$x(`//div[contains(@class, "value___VDQPF")]`);
        let hiSpan = AccountInfoSpans[0];
        let friendSpan = AccountInfoSpans[2];

        let hiNum = await this.page.evaluate(node => node.innerText, hiSpan);
        let friendNum = await this.page.evaluate(node => node.innerText, friendSpan);
        logger.info(`脉脉 ${this.userInfo.name} 打招呼还剩: ${hiNum} 加好友还剩: ${friendNum}`);

        if (hiNum == 0) {
            this.hiEnd = true;
            logger.info(`脉脉 ${this.userInfo.name} 打招呼用光了`);
        }

        if (friendNum == 0) {
            this.friendEnd = true;
            logger.info(`脉脉 ${this.userInfo.name} 加好友用光了`);
        }
    }

    dealPeople = async(task) => {
        let peopleItems = await this.page.$x(`//div[contains(@class, "mainContent___nwb6Q")]`);
        logger.info(`脉脉 ${this.userInfo.name} 搜索到 ${peopleItems.length} 个people item`);
        for (let index in this.peopleCache) {
            if (this.hiEnd && this.friendEnd)
                break;

            if (task.helloSum <= 0) {
                logger.info(`脉脉 ${this.userInfo.name} 今天的指标已经用完`);
                break;
            }
            logger.info(`脉脉 ${this.userInfo.name} 还剩 ${task.helloSum} 个招呼`);

            let peopleItem = peopleItems[index];
            let peopleInfo = this.peopleCache[index];
        
            await this.page.evaluate((item)=>item.scrollIntoView(), peopleItem);
            let f = await this.filterPeople(peopleItem, peopleInfo, task);
            if (f) 
                continue

            try {
                await this.touchPeople(task, peopleItem, peopleInfo, index);
                await this.reportTouch(task, peopleInfo);
                task.helloSum -= 1;
            } catch (e) {
                logger.error(`脉脉 ${this.userInfo.name} 给一个人打招呼 ${peopleInfo.name} 出现异常: `, e);
            }
            await this.checkdialog();
        }
    }


    touchPeople = async(task, peopleItem, peopleInfo, index) => {
        await this.page.evaluate((item)=>item.scrollIntoView({block: "center"}), peopleItem);
        await sleep(200);
        if (!this.friendEnd)
            await this.addFriend(peopleItem, index, peopleInfo);
        if (!this.hiEnd)
            await this.sayHi(peopleItem, peopleInfo, task);
    }

    reportTouch = async(task, peopleInfo) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/report/v2`,
            data: {
              accountID: this.userInfo.accountID,
              jobID: task.jobID,
              taskStatus: [{
                taskType: 'batchTouch',
                details: {
                  candidateList: [peopleInfo.id]
                }
              }]
            },
            method: 'POST'
        });

        task.helloSum -= 1;
    }

    addFriend = async(peopleItem, index, peopleInfo) => {
        await this.page.hover(`div.talent-common-card:nth-of-type(${parseInt(index) + 1})  .more___RBoc4`);
        await sleep(300);

        let dropDiv = await this.waitElement(`//div[contains(@class, "mui-popover-placement-bottomRight") and not(contains(@class, "mui-popover-hidden"))]`, this.page, 5);
        let timesNum = 0;
        while (!dropDiv && timesNum < 5) {
            logger.info(`脉脉 ${this.userInfo.name} 下拉框没有出现，用户乱动`);
            await this.page.hover(`div.talent-common-card:nth-of-type(${parseInt(index) + 1})  .more___RBoc4`);
            await sleep(500);
            dropDiv = await this.waitElement(`//div[contains(@class, "mui-popover-placement-bottomRight") and not(contains(@class, "mui-popover-hidden"))]`, this.page, 5);
            timesNum += 1;
        }

        let [addFriendBtn] = await dropDiv.$x(`//div[text() = "加好友"]`);
        if (addFriendBtn)
            await addFriendBtn.click();
  
        await this.page.hover("body")
           
        await sleep(300);
        // await this.checkFriendEnd();
        await this.closeProfile(peopleInfo.name);
        await this.checkdialog();
    }

    closeProfile = async(name) => {
        let [shade] = await this.page.$x(`//div[contains(@class, "ant-drawer-mask")]`);
        if (shade) {
            logger.info(`脉脉 ${this.userInfo.name} 出现遮罩异常`);
            let [closeBtn] = await this.page.$x(`//div[contains(@class, "ant-drawer-title")]/div/div[contains(@class, "ml-auto")]/span`);
            await closeBtn.click();
            await sleep(300);
        }
    }

    checkFriendEnd = async() => {
        let [friendOverSpan] = await this.page.$x(`//span[contains(@class, color-diution) and text() = "加好友券已用完，请在我的资产页面兑换"]`);
        if (friendOverSpan) {
            logger.info(`脉脉 ${this.userInfo.name} 加好友用完了`);
            this.friendEnd = true;
        }
    }

    checkdialog = async() => {
        let [btn] = await this.page.$x(`//span[text() = "我知道了"]`);
        if (btn) {
            await btn.click()
            await sleep(500)
            await this.checkEnd();
        }
    }

    sayHi = async(peopleItem, peopleInfo, task) => {
       let [chatBtn] = await peopleItem.$x(`//div[text() = "立即沟通"]`);
       if (!chatBtn) {
          logger.info(`脉脉 ${this.userInfo.name} ${peopleInfo.name} 没有打招呼的按钮`);
          return;
       }

       let sayMsg = task.touch_msg;
       await chatBtn.click();
       await this.dealSayHiTxt(sayMsg, peopleInfo);

       let [sendBtn] = await this.page.$x(`//button[text() = "立即发送"]`);
       if (!sendBtn) {
           [sendBtn] = await this.page.$x(`//button[text() = "发送后留在此页"]`);
       }
       await sendBtn.click();
       await sleep(200);

       await this.checkHiEnd();
    }

    dealSayHiTxt = async(sayMsg, peopleInfo) => {
       let name = peopleInfo.name;
       let textarea = await this.waitElement('//textarea[contains(@class, "templateInput___19bTd")]', this.page);
       let text = await this.page.evaluate(node => node.textContent, textarea);
       if (sayMsg != text) {
          logger.info(`脉脉 ${this.userInfo.name} name: ${name} 打招呼需要切换话术 text: ${text}`);
          while(text.length > 0) {
            await textarea.focus();
            await sleep(200);
            await textarea.click({clickCount: 3});
            await sleep(500);
            await this.page.keyboard.press("Backspace");
            textarea = await this.waitElement('//textarea[contains(@class, "templateInput___19bTd")]', this.page);
            text = await this.page.evaluate(node => node.textContent, textarea);
            logger.info(`脉脉 ${this.userInfo.name} name: ${name} 打招呼需要切换话术 text: ${text}`);
          }
          await sleep(500);
          await textarea.type(sayMsg);
          await sleep(500);  
       }
    }

    checkHiEnd = async() => {
        let [runOutTxt] = await this.page.$x(`//span[text() = "立即沟通券已用完，请联系你的管理员"]`);
        if (runOutTxt) {
            logger.info(`脉脉 ${this.userInfo.name} 打招呼用完`);
            this.hiEnd = true;
            let [msgCloseBtn] = await this.page.$x(`//div[contains(@class, "mui-modal-close-x")]`);
            if (msgCloseBtn)
                await msgCloseBtn.click();
        }
    }

    filterPeople = async(peopleItem, peopleInfo, task) => {
        let [divNameSpan] = await peopleItem.$x(`//span[contains(@class, "name___2TJeJ")]`);
        let divName = await this.page.evaluate(node => node.innerText, divNameSpan);
        let peopleName = peopleInfo.name;
        logger.info(`脉脉 ${this.userInfo.name} divName: ${divName} peopleName: ${peopleName}`);
        if (peopleName != divName) {
            logger.info(`脉脉 ${this.userInfo.name} 名字对不上，有问题`);
            return true;
        }

        try {
            const { status, data } = await Request({
                url: `${BIZ_DOMAIN}/recruit/candidate/filter/v2`,
                data: {
                    accountID: this.userInfo.accountID,
                    jobID: task.jobID,
                    candidateInfo: peopleInfo
                },
                headers: {"Connection": "keep-alive"},
                method: 'POST'
            });
  
            logger.info(`脉脉 ${this.userInfo.name} 筛选结果 ${status} ${data.touch} ` );
  
            if (status == 0 && data.touch) {
                return false;
            }
        } catch (e) {
            logger.error(`脉脉 ${this.userInfo.name} 筛选错误为##`, e);
        }

        return true;
    }

    nextPage = async() => {
        let [pageDiv] = await this.page.$x(`//div[contains(@class, "paginationCon___29K2m")]`);
        if (!pageDiv) {
            logger.info(`脉脉 ${this.userInfo.name} 没有分页栏`);
            return false;
        }
        await pageDiv.click();

        let [disable_next_btn] = await this.page.$x(`//div[contains(@class, "nextPage___1s7KJ") and contains(@class, "disabled___kWxdU")]`);
        if (disable_next_btn) {
            logger.info(`脉脉 ${this.userInfo.name} 翻页到头了`);
            return false;
        }

        let [next_btn] = await this.page.$x(`//div[contains(@class, "nextPage___1s7KJ")]`);
        await next_btn.click();

        await this.waitListRefresh();
        return true;
    }
}

module.exports = Resume;
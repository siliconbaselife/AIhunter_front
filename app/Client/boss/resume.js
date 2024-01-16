const Base = require('./base');
const { sleep } = require('../../utils');
const Request = require('../../utils/Request');
const logger = require('../../Logger');
const { BIZ_DOMAIN } = require("../../Config/index");

class Resume extends Base {
    keywordDelay = 40;
    peopleCache;
    getList;
    frame;

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
        logger.info(`linkedin ${this.userInfo.name} 领取到任务: ${JSON.stringify(data)}`);

        return data["task"];
    }

    run = async() => { 
        logger.info(`boss ${this.userInfo.name} 打招呼，开始执行打招呼任务`);
        let tasks = await this.queryTasks();
        logger.info(`boss ${this.userInfo.name} 获取到 ${tasks.length} 个打招呼任务, 任务如下: ${JSON.stringify(tasks)}`);
        for (let index in tasks) {
            let task = tasks[index];
            this.peopleCache = {};
            if (task.helloSum <= 0) {
                logger.info(`boss ${this.userInfo.name} 任务 ${parseInt(index) + 1} 已经完成`);
            }

            logger.info(`boss ${this.userInfo.name} 开始第 ${parseInt(index) + 1} 个任务`);
            logger.info(`boss ${this.userInfo.name} 任务如下: ${JSON.stringify(task)}`);

            try {
                await this.dealTask(task);
            } catch (e) {
                logger.error(`boss ${this.userInfo.name} 任务 ${parseInt(index) + 1} 出现异常失败: `, e);
            }
        }
    }

    dealTask = async(task) => {
        await this.dealTaskBefore();
        try {
            await this.setFilter(task);
            await this.noopTask(task);
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} 打招呼异常: `, e);
        }
        await this.closeSearch();
    }

    noopTask = async(task) => {
        let index = 0;
        while(global.running) {
            logger.info(`boss ${this.userInfo.name} 打招呼处理第 ${parseInt(index) + 1} 个item`);
            let geekItems = await this.frame.$x(`//li[contains(@class, "card-item")]`);

            if (index >= geekItems.length || task.helloSum <= 0) {
                logger.info(`boss ${this.userInfo.name} 本次搜索操作完成`);
                break;
            }

            await this.scrollToPosition(index);
            let geekItem = geekItems[index];
            index += 1;
            let {geekId, name} = await this.fetchItemIdAndName(geekItem);
            logger.info(`boss ${this.userInfo.name} 当前处理候选人 id: ${geekId} name: ${name}`);

            let peopleInfo = this.peopleCache[geekId];
            if (!peopleInfo)
                continue;

            await this.setOnlineInfo(peopleInfo, geekItem);

            logger.info(`boss ${this.userInfo.name} 获取到简历: ${JSON.stringify(peopleInfo)}`);
            let f = await this.filterPeople(peopleInfo, task);
            if (f)
                continue;

            // await this.touchPeople(item, task);
            // await this.reportTouch(task, peopleInfo.geekCard.geekId);
        }
    }

    setOnlineInfo = async(peopleInfo, geekItem) => {
        let [onlineImg] = await geekItem.$x(`//img[contains(@class, "online-marker")]`);
        if (onlineImg) {
            peopleInfo.isOnline = true;
        } else {
            peopleInfo.isOnline = false;
        }
    }

    reportTouch = async(task, id) => {
        const { status, data } = await Request({
            url: `${BIZ_DOMAIN}/recruit/account/task/report/v2`,
            data: {
              accountID: this.userInfo.accountID,
              jobID: task.jobID,
              taskStatus: [{
                taskType: 'batchTouch',
                details: {
                  candidateList: [id]
                }
              }]
            },
            method: 'POST'
        });

        task.helloSum -= 1;
    }

    touchPeople = async(item, task) => {
        let [sayHiBtn] = await item.$x(`//button[@class, "btn-greet"]`);
        await sayHiBtn.click();
        await sleep(300);
    }

    filterPeople = async(peopleInfo, task) => {
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
  
            logger.info(`boss ${this.userInfo.name} 筛选结果 ${status} ${data.touch} ` );
  
            if (status == 0 && data.touch) {
                return false;
            }
        } catch (e) {
            logger.error(`boss ${this.userInfo.name} 筛选错误为##`, e);
        }

        return true;
    }

    scrollToPosition = async(index) => {
        let listHeight = 180 * index;

        await this.frame.evaluate((height) => {
            window.scrollTo(0, height);
          }, listHeight);
        await sleep(300);
    }

    fetchItemIdAndName = async(geekItem) => {
        let [cardInner] = await geekItem.$x(`//div[contains(@class, "card-inner")]`);
        let geekId = await this.frame.evaluate(node => node.dataset.geek, cardInner);

        let [nameSpan] = await geekItem.$x(`//span[contains(@class, "name")]`);
        let name = await this.frame.evaluate(node => node.innerText, nameSpan);
        return {geekId, name};
    }

    dealTaskBefore = async() => {
        this.getList = async (response) => {
            try {
              const url = response.url();
              const request = response.request();
              const method = request.method();
  
              if (url.startsWith('https://www.zhipin.com/wapi/zpjob/rec/geek/list') &&
                response.status() === 200 && (['GET', 'POST'].includes(method))) {
                  let res;
                  try {
                      res = await response.json();
                  } catch (e) {
                      logger.error(`boss ${this.userInfo.name} 监听获取列表数据异常：`, e);
                  }
  
                  if (res && res.code === 0 && res.zpData) {
                      await this.dealPeopleList(res.zpData.geekList);
                  }
              }
           } catch (e) {
              logger.error(`boss ${this.userInfo.name} get candidate list error: ${e}`);
           }
        }
        this.page.on('response', this.getList);
    }

    dealPeopleList = async(geekList) => {
        for (let geek of geekList) {
            this.peopleCache[geek.geekCard.encryptGeekId] = geek;
        }
    }

    setFilter = async(task) => {
        await this.refresh();
        await this.setSearchTxt(task);
        await this.setFilterSpan(task);
        await this.setExperience(task);
        await this.setEducation(task);
        await this.setSalary(task);
        await this.setIntention(task);

        await this.setFilterSureBtn();
    }

    setIntention = async(task) => {
        if (!task.filter.status || task.filter.status.length == 0)
            return 

        let [intentionSpan] = await this.frame.$x(`//div[contains(@class, "intention")]`);
        await this.frame.evaluate((item)=>item.scrollIntoView(), intentionSpan);
        for (let intention of task.filter.status) {
            let [intentionBtn] = await intentionSpan.$x(`//span[text() = "${intention}"] | //div[text() = "${intention}"]`);
            await intentionBtn.click();
            await sleep(300);
        }

        await sleep(1000);

        logger.info(`boss ${this.userInfo.name} setIntention end`);
    }

    setSalary = async(task) => {
        if (!task.filter.pay || task.filter.pay.length == 0)
            return 

        let [salarySpan] = await this.frame.$x(`//div[contains(@class, "salary")]`);
        await this.frame.evaluate((item)=>item.scrollIntoView(), salarySpan);
        let [salaryBtn] = await salarySpan.$x(`//span[text() = "${task.filter.pay}"] | //div[text() = "${task.filter.pay}"]`);
        await salaryBtn.click();
        await sleep(300);

        await sleep(1000);

        logger.info(`boss ${this.userInfo.name} setSalary end`);
    }

    setEducation = async(task) => {
        if (!task.filter.education || task.filter.education.length == 0)
            return 

        let [educationSpan] = await this.frame.$x(`//div[contains(@class, "degree")]`);
        await this.frame.evaluate((item)=>item.scrollIntoView(), educationSpan);
        for (let education of task.filter.education) {
            let [educationBtn] = await educationSpan.$x(`//span[text() = "${education}"] | //div[text() = "${education}"]`);
            await educationBtn.click();
            await sleep(300);
        }

        await sleep(1000);

        logger.info(`boss ${this.userInfo.name} setEducation end`);
    }

    setExperience = async(task) => {
        if(!task.filter.work_time || task.filter.work_time.length == 0) {
            logger.info(`boss ${this.userInfo.name} no work_time`);
            return;
        }

        let [experienceSpan] = await this.frame.$x(`//div[contains(@class, "experience")]`);
        await this.frame.evaluate((item)=>item.scrollIntoView(), experienceSpan);
        for (let work_time of task.filter.work_time) {
            let [workTimeBtn] = await experienceSpan.$x(`//span[text() = "${work_time}"] | //div[text() = "${work_time}"]`);
            await workTimeBtn.click();
            await sleep(300);
        }
        await sleep(1000);

        logger.info(`boss ${this.userInfo.name} setExperience end`);
    }

    setFilterSureBtn = async() => {
        const [submitBtn] = await this.frame.$x('//span[text() = "确定"] | //div[text() = "确定"]');
        await submitBtn.click();
        await sleep(1000);
    }

    setFilterSpan = async() => {
        let [filterBtn] = await this.frame.$x(`//div[contains(@class, "filter-label")]`);
        await filterBtn.click();
        await sleep(1000);
        await this.waitElement(`//div[contains(@class, "filter-panel")]`, this.frame);

        logger.info(`boss ${this.userInfo.name} setFilterSpan end`);
    }

    closeSearch = async() => {
        let [jobManageBtn] = await this.page.$x(`//a[contains(@ka, "menu-manager-job")]`);
        await jobManageBtn.click();
        await sleep(500);
    }

    refresh = async() => {
        await this.closeSearch();

        let [recommendBtn] = await this.page.$x(`//a[contains(@ka, "menu-geek-recommend")]`);
        await recommendBtn.click();
        await sleep(500);

        const recommendFrame = await this.page.$('#recommendContent iframe');
        this.frame = await recommendFrame.contentFrame();
    }

    setSearchTxt = async(task) => {
        let dropmenu = await this.waitElement(`//div[contains(@class, "ui-dropmenu-label")]`, this.frame);
        await dropmenu.click();

        let input = await this.waitElement(`//input[contains(@class, "chat-job-search") and contains(@placeholder, "请输入职位名称")]`, this.frame);
        await input.click();

        let [clearBtn] = await this.frame.$x(`//div[contains(@class, "top-chat-search")]/i[contains(@class, "iboss-guanbi")]`);
        if (clearBtn) {
            await clearBtn.click();
            await sleep(500);
        }

        await this.page.keyboard.type(task.filter.boss_job_name, { delay: parseInt(this.keywordDelay + Math.random() * this.keywordDelay) });
        let li = await this.waitElement(`//li[contains(@class, "job-item")]`, this.frame);
        if (!li) {
            logger.error(`boss ${this.userInfo.name} 任务名获取异常`);
            throw new Error("任务名获取异常");
        }
        await li.click();
        await sleep(500);
        logger.info(`boss ${this.userInfo.name} setSearchTxt end`);
    }
}

module.exports = Resume;
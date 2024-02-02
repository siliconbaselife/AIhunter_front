
module.exports =
`
    class LiePinProfile extends Base {
        static instance = new LiePinProfile();
        static getInstance() {
            if (!LiePinProfile.instance) LiePinProfile.instance = new LiePinProfile();
            return LiePinProfile.instance;
        }

        LIEPIN_PROFILE_CHAT = "liepin_profile_chat";

        LIEPIN_PROFILE_SEARCH = "liepin_profile_search";

        LIEPIN_DOWNLOAD_RESUME = "liepinDownloadResume";

        /**
         * 初始化
         */
        initialize() {
            console.log("LiePinProfile inited");
            // 监听收集简历事件，帮忙收集简历
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_PROFILE_SEARCH, this.handleLiePinProfileSearch.bind(this));
            // 监听打招呼事件，帮忙打招呼
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_PROFILE_CHAT, this.handleLiePinProfileChat.bind(this));
            // 监听下载简历事件，帮忙下载简历
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_DOWNLOAD_RESUME, this.handleLiePinDownloadResume.bind(this));

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
            console.log("str result", Number(str.replace(/[^\\d]/g, " ")));
            return Number(str.replace(${"/[^\\d]/g"}, " "));
        }


        /**
         * 猎聘下载简历
         */
        async handleLiePinDownloadResume() {
            try {
                const resumeContainer = await waitElement(".c-resume-body-cont");
                if (!resumeContainer) return { status: "fail", error: "没有找到简历项" };
                const operationBtns = (await waitElements(".resume-detail-operation-wrap .resume-operation-btn", resumeContainer, 1)) || [];
                let btn;
                for (let buttonEl of operationBtns) {
                    if (buttonEl.innerText === "免费获取联系方式" || buttonEl.innerText === "保存") btn = buttonEl;
                }
                if (!btn) return { status: "fail", error: "没有找到下载简历按钮"};
                btn.click();

                await sleep(500);
                
                const dialogEl = await waitElement(".ant-modal-confirm", 5, document, () => {btn && btn.click()});
                const confirmBtn = await waitElement(".ant-modal-confirm-btns button",5, document, );
                if (!confirmBtn) return {status: "fail", error: "没有确认按钮" + "弹窗元素:" + (dialogEl ? "true" : "false")};
                confirmBtn.click();
                await sleep(2 * 1000);
                return { status: "success", error: "" };
            } catch (error) {
                return { status: "fail", error: "liepin下载简历出错:" + (error && error.message || error) };
            }
        }
    }
`

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
                const chatBtn = await waitElement(".resume-detail-operation-wrap .chat-btn");
                chatBtn.click();

                await sleep(1000);

                const dialogEl = await waitElement(".hpublic-message-select-box-auto", 1, document).catch(err => {
                    console.log("点击立即沟通按钮后没有弹出弹窗，认为是打招呼成功了", err);
                    return true;
                })
                if (dialogEl === true) return { status: "success", error: null };

                // 打招呼语第一个选项按钮
                const firstChatTemaplteBtn = await waitElement(".hpublic-message-select-box-auto .li-item:nth-of-type(1)");

                firstChatTemaplteBtn.click();

                // 打开岗位选择
                const jobSelectInput = await waitElement(".hpublic-job-select input#jobId");
                const mouseDownEvent = new Event("mousedown", {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    button: 1
                });
                jobSelectInput.dispatchEvent(mouseDownEvent);

                await sleep(1000);

                // 选择岗位
                const jobOptions = await waitElements(".hpublic-job-and-msg-modal-cont-new .ant-form-item-control .ant-select-item-option");
                let targetOptionEl;
                if (jobOptions && jobOptions.length) {
                    for (let optionEl of jobOptions) {
                        const textEl = optionEl.querySelector("strong");
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
                const submitBtn = await waitElement(".hpublic-job-and-msg-modal-cont-new .btn-bar .btn-ok");
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
                await sleep(1 * 1000);
                const basicInfo = await this.getBasicInfo().catch(err => { errorMsg += (err && err.message || ""); return null });
                const jobExpectancies = await this.getJobExpectancy().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const workExperiences = await this.getWorkExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const projectExperiences = await this.getProjectExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const eduExperiences = await this.getEduExperiences().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const languages = await this.getlanguages().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const skills = await this.getSkills().catch(err => { errorMsg += (err && err.message || ""); return [] });
                const selfEvaInfo = await this.getSelfEvaInfo().catch(err => { errorMsg += (err && err.message || ""); return "" });
                const additionalInfo = await this.getAdditionalInfo().catch(err => { errorMsg += (err && err.message || ""); return "" });

                const peopleInfo = this.gatherAllInfo({
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
            const baseInfoEl = await waitElement("#resume-detail-basic-info", 3);

            if (baseInfoEl) {
                const nameEl = await waitElement(".name-box .name", 1, baseInfoEl);
                const name = nameEl && nameEl.innerText;
                const statusEl = await waitElement(".user-status-tag", 1, baseInfoEl);
                const status = statusEl && statusEl.innerText;
                const baseRowEls = await waitElements(".basic-cont .sep-info", baseInfoEl);
                const [baseRowEl1, baseRowEl2] = baseRowEls;
                const [sex, age, district, degree, workyear, salary] = baseRowEl1.innerHTML.split("<i></i>");
                const [current_job_name, current_company_name] = baseRowEl2.innerHTML.split("<i></i>");
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
            const jobExpectancyEl = await waitElement("#resume-detail-job-exp-info", 1);
            const result = [];
            if (jobExpectancyEl) {
                const oneRow = await waitElement(".left-wrap", 1, jobExpectancyEl);
                const jobExpectancyNameEl = await waitElement(".title", 1, oneRow);
                const jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                const jobExpectancySalaryEl = await waitElement(".salary", 1, oneRow);
                const jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                const jobExpectancyDistrictEl = await waitElement(".dqname", 1, oneRow);
                const jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                const jobExpectancyLabelContainerEl = await waitElement(".lebels-wrap", 1, oneRow);
                const jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl);
                const jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);

                result.push({
                    jobExpectancyName,
                    jobExpectancySalary,
                    jobExpectancyDistrict,
                    jobExpectancyLabels
                })

                // 暂不需要所有的求职期望数据
                // const viewAllBtn = await waitElement(".want-job .job-card-right", 1, jobExpectancyEl);
                // if (!viewAllBtn) { // 没有查看全部按钮
                //     const oneRow = await waitElement(".left-wrap", 1, jobExpectancyEl);
                //     const jobExpectancyNameEl = await waitElement(".title", 1, oneRow);
                //     const jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                //     const jobExpectancySalaryEl = await waitElement(".salary", 1, oneRow);
                //     const jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                //     const jobExpectancyDistrictEl = await waitElement(".dqname", 1, oneRow);
                //     const jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                //     const jobExpectancyLabelContainerEl = await waitElement(".lebels-wrap", 1, oneRow);
                //     const jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl);
                //     const jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);

                //     result.push({
                //         jobExpectancyName,
                //         jobExpectancySalary,
                //         jobExpectancyDistrict,
                //         jobExpectancyLabels
                //     })
                // } else { // 有查看全部按钮
                //     viewAllBtn.click();
                //     await sleep(500);
                //     const dialogEl = await waitElement(".want-job-list-modal", 5);
                //     const wantJobEls = (await waitElements(".want-job-list .job-card-left", dialogEl)) || [];
                //     for (let wantJobEl of wantJobEls) {
                //         const jobExpectancyNameEl = await waitElement(".job-name", 1, wantJobEl);
                //         const jobExpectancyName = jobExpectancyNameEl && jobExpectancyNameEl.innerText;
                //         const jobExpectancySalaryEl = await waitElement(".salary", 1, wantJobEl);
                //         const jobExpectancySalary = jobExpectancySalaryEl && jobExpectancySalaryEl.innerText;
                //         const jobExpectancyDistrictEl = await waitElement(".address", 1, wantJobEl);
                //         const jobExpectancyDistrict = jobExpectancyDistrictEl && jobExpectancyDistrictEl.innerText;
                //         const jobExpectancyLabelContainerEl = await waitElement(".industry-name", 1, wantJobEl);
                //         const jobExpectancyLabelEls = await waitElements("span", jobExpectancyLabelContainerEl);
                //         const jobExpectancyLabels = [...(jobExpectancyLabelEls || [])].map(item => item && item.innerText);
                //         result.push({
                //             jobExpectancyName,
                //             jobExpectancySalary,
                //             jobExpectancyDistrict,
                //             jobExpectancyLabels
                //         })
                //     }
                //     const closeBtnEl = await waitElement(".ant-modal-close", 1, dialogEl);
                //     if (closeBtnEl) closeBtnEl.click();
                // }
            }

            return result;
        }

        async getWorkExperiences() {
            const workExperiencesEl = await waitElement("#resume-detail-work-info", 1);
            const result = [];
            if (workExperiencesEl) {
                const workExperienceEls = (await waitElements(".resume-detail-template-cont", workExperiencesEl)) || [];


                for (let workExperienceEl of workExperienceEls) {
                    const workInCompanyEl = await waitElement(".rd-info-tpl-item-head .rd-work-comp>h5", 1, workExperienceEl);
                    const workInCompany = workInCompanyEl && workInCompanyEl.innerText;
                    const workInCompanyTimeEl = await waitElement(".rd-info-tpl-item-head .rd-work-time", 1, workExperienceEl);
                    const workInCompanyTime = workInCompanyTimeEl && workInCompanyTimeEl.innerText;

                    const workInCompanyTagEls = await waitElements(".rd-info-tpl-item-cont .tags-box .tag", workExperienceEl);
                    const workInCompanyTags = [...(workInCompanyTagEls || [])].map(item => item.innerText);
                    const workInCompanyJobNameEl = await waitElement(".rd-info-tpl-item-cont .job-name");
                    const workInCompanyJobName = workInCompanyJobNameEl && workInCompanyJobNameEl.innerText;

                    const workInCompanyJobContentRowEls = (await waitElements(".rd-info-tpl-item-cont .rd-info-row", workExperienceEl)) || [];
                    const workInCompanyJobContents = [];
                    for (let WICJCRE of workInCompanyJobContentRowEls) {
                        const colEls = (await waitElements(".rd-info-col", WICJCRE)) || [];
                        for (let colEl of colEls) {
                            const keyNameEl = await waitElement(".rd-info-col-title", 1, colEl);
                            const keyName = keyNameEl && keyNameEl.innerText;
                            const valueNameEl = await waitElement(".rd-info-col-cont", 1, colEl);
                            const valueName = valueNameEl && valueNameEl.innerText;
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
            const projectExperiencesEl = await waitElement("#resume-detail-project-info", 1);
            const result = [];
            if (projectExperiencesEl) {
                const showMoreBtn = await waitElement(".rd-info-other-box", 1, projectExperiencesEl);
                if (showMoreBtn) {
                    showMoreBtn.click();
                    await sleep(500);
                }

                const projectExperienceEls = (await waitElements(".resume-detail-template-cont .rd-info-tpl-item", projectExperiencesEl)) || [];
                for (let projectExperienceEl of projectExperienceEls) {
                    const ProjectExpNameEl = await waitElement(".rd-info-tpl-item-head .rd-work-comp>h5", 1, projectExperienceEl);
                    const ProjectExpName = ProjectExpNameEl && ProjectExpNameEl.innerText;
                    const ProjectExpTimeEl = await waitElement(".rd-info-tpl-item-head .rd-work-time", 1, projectExperienceEl);
                    const ProjectExpTime = ProjectExpTimeEl && ProjectExpTimeEl.innerText;

                    const ProjectExpJobContentRowEls = (await waitElements(".rd-info-tpl-item-cont .rd-info-row", projectExperienceEl)) || [];
                    const ProjectExpJobContents = [];
                    for (let WICJCRE of ProjectExpJobContentRowEls) {
                        const colEls = (await waitElements(".rd-info-col", WICJCRE)) || [];
                        for (let colEl of colEls) {
                            const keyNameEl = await waitElement(".rd-info-col-title", 1, colEl);
                            const keyName = keyNameEl && keyNameEl.innerText;
                            const valueNameEl = await waitElement(".rd-info-col-cont", 1, colEl);
                            const valueName = valueNameEl && valueNameEl.innerText;
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
            const educationsEl = await waitElement("#resume-detail-edu-info", 1);
            const result = [];
            if (educationsEl) {
                const educationEls = await waitElements(".rd-edu-info-item", educationsEl, 1);
                if (educationEls && educationEls.length) {
                    for (let educationEl of educationEls) {
                        const schoolBasicInfoEl = await waitElement(".rd-edu-info-item .edu-school-cont", 1, educationEl);
                        const schoolNameEl = await waitElement(".school-name", 1, schoolBasicInfoEl);
                        const schoolName = schoolNameEl && schoolNameEl.innerText;
                        const schoolSpecialEl = await waitElement(".school-special", 1, schoolBasicInfoEl);
                        const schoolSpecial = schoolSpecialEl && schoolSpecialEl.innerText;
                        const schoolDegreeEl = await waitElement(".school-degree", 1, schoolBasicInfoEl);
                        const schoolDegree = schoolDegreeEl && schoolDegreeEl.innerText;
                        const schoolTimeEl = await waitElement(".school-time", 1, schoolBasicInfoEl);
                        const schoolTime = schoolTimeEl && schoolTimeEl.innerText;

                        const schoolTagEls = await waitElements(".edu-school-tags", schoolBasicInfoEl);
                        const schoolTags = [...(schoolTagEls || [])].map(item => item.innerText);
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
            const languagesEl = await waitElement("#resume-detail-lang-info", 1);
            const result = [];
            if (languagesEl) {
                const languageItemEls = await waitElements(".rd-lang-item", languagesEl);
                if (languageItemEls && languageItemEls.length) {
                    for (let languageItemEl of languageItemEls) {
                        const languageNameEl = await waitElement(".lang-name", 1, languageItemEl);
                        const languageName = languageNameEl && languageNameEl.innerText;
                        const languageLevelEls = (await waitElements(".lang-level", languageItemEl, 1)) || [];
                        const languageLevels = [...languageLevelEls].map(item => item.innerText);

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
            const skillsEl = await waitElement("#resume-detail-skill-info", 1);
            const result = [];
            if (skillsEl) {
                const skillTagEls = (await waitElements(".skill-tag-box .skill-tag", skillsEl)) || [];


                if (skillTagEls && skillTagEls.length) {
                    result = [...skillTagEls].map(item => item.innerText)
                }
            }

            return result;
        }

        async getSelfEvaInfo() {
            const selfEvaInfoEl = await waitElement("#resume-detail-self-eva-info", 1);
            let result = "";
            if (selfEvaInfoEl) {
                const detailEl = await waitElement(".resume-detail-template-cont", 1, selfEvaInfoEl);
                if (detailEl) {
                    result = detailEl && detailEl.innerText;
                }
            }

            return result;
        }

        async getAdditionalInfo() {
            const additionalInfoEl = await waitElement("#resume-detail-addition-info", 1);
            let result = "";
            if (additionalInfoEl) {
                const detailEl = await waitElement(".resume-detail-template-cont", 1, additionalInfoEl);
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
            const { basicInfo, jobExpectancies, workExperiences, projectExperiences, eduExperiences, languages, skills, selfEvaInfo, additionalInfo } = info;
            const finalResult = {
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
                const { name, status, sex, age, district, degree, workyear, salary, current_job_name, current_company_name } = basicInfo;
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
                    const { jobExpectancyName, jobExpectancySalary, jobExpectancyDistrict, jobExpectancyLabels } = item;
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
                    const {
                        workInCompany,
                        workInCompanyTime,
                        workInCompanyTags,
                        workInCompanyJobName,
                        workInCompanyJobContents
                    } = item;
                    const { startYear, startMonth, endYear, endMonth, yearNum, monthNum } = this.parseTime(workInCompanyTime);
                    const salaryItem = workInCompanyJobContents.find(item => item.key.indexOf("薪") !== -1);
                    const dutyItem = workInCompanyJobContents.find(item => item.key.indexOf("职责") !== -1);
                    const dqItem = workInCompanyJobContents.find(item => item.key.indexOf("工作地点") !== -1);
                    const jobTitleItem = workInCompanyJobContents.find(item => item.key.indexOf("职位类别") !== -1);
                    const reportToItem = workInCompanyJobContents.find(item => item.key.indexOf("汇报对象") !== -1);
                    const rwDeptItem = workInCompanyJobContents.find(item => item.key.indexOf("所在部门") !== -1);
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
                        const { ProjectExpName,
                            ProjectExpTime,
                            ProjectExpJobContents } = item;
                        const rpdTitleItem = ProjectExpJobContents.find(item => item.key.indexOf("项目职务") !== -1);
                        const rpdDescItem = ProjectExpJobContents.find(item => item.key.indexOf("项目描述") !== -1);
                        const rpdDutyItem = ProjectExpJobContents.find(item => item.key.indexOf("项目职责") !== -1);
                        const rpdCompnameItem = ProjectExpJobContents.find(item => item.key.indexOf("所在公司") !== -1);
                        const rpdAchievementItem = ProjectExpJobContents.find(item => item.key.indexOf("项目业绩") !== -1);
                        const { startYear, startMonth, endYear, endMonth } = this.parseTime2(ProjectExpTime);
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
                        const { schoolName,
                            schoolSpecial,
                            schoolDegree,
                            schoolTime,
                            schoolTags } = item;
                        const { startYear, startMonth, endYear, endMonth } = this.parseTime2(schoolTime)
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
                        const { languageName,
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
    }
`
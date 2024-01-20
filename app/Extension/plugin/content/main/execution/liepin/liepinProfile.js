
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

                const dialogEl = await waitElement(".hpublic-message-select-box-auto", document, 4).catch(err => {
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
                    button: 2
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

            console.log("liepin_profile_search start")

            await sleep(8000 * 1000); // 测试代码
        }
    }
`
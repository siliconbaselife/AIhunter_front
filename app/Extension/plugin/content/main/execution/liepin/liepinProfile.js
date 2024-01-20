
module.exports =
`
    class LiePinProfile extends Base {
        static instance = new LiePinProfile();
        static getInstance() {
            if (!LiePinProfile.instance) LiePinProfile.instance = new LiePinProfile();
            return LiePinProfile.instance;
        }

        LIEPIN_PROFILE_CHAT = "liepin_profile_chat"

        /**
         * 初始化
         */
        initialize() {
            console.log("LiePinProfile inited");
            // 监听打招呼事件，帮忙打招呼
            ContentMessageHelper.getInstance().listenFromOthers(this.LIEPIN_PROFILE_CHAT, this.handleLiePinProfileChat.bind(this));
        }

        /**
         * 打招呼
         * @returns {Promise<boolean>} 打招呼是否成功
         */
        async handleLiePinProfileChat() {
            try {
                console.log("liepin_profile_chat");

                /** @todo 这里进行打招呼操作 */
                /** @todo 完成后返回true */
                // 测试，先停止
                await sleep(500 * 1000);

                // 标记已成功
                return true;
            } catch (error) {
                // 标记失败，带去错误信息
                console.log("给当前人员打招呼失败", error);
                // 叫background上传记录 // 暂时不用报告失败情况
                return false
            }
        }
    }
`

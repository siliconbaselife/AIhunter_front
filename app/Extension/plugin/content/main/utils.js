module.exports = `
/**
 * 持续获取element
 * @returns {Promise<HTMLElement>}
 */
const waitElement = async (elementName, maxNum = 10, rootElement = document) => {
    let element = await rootElement.querySelector(elementName);
    let waitNum = 0;
    while (!element && maxNum != 1) {
        console.log(waitNum + "网太慢了，element还没有刷新出来" + elementName);
        await sleep(1000);

        waitNum += 1;
        if (waitNum > maxNum)
            return;
        element = await rootElement.querySelector(elementName);
    }

    return element;
}

/**
 * 持续获取elements
 * @param {string} elementName
 * @param {HTMLElement} rootElement
 * @returns {Promise<NodeList>}
 */
const waitElements = async (elementName, rootElement = document, maxNum = 10) => {
    let element = rootElement.querySelectorAll(elementName);
    let waitNum = 0;
    while (!element && maxNum != 1) {
        console.log(waitNum + "网太慢了，element还没有刷新出来" + elementName);
        await sleep(1000);

        waitNum += 1;
        if (waitNum > maxNum)
            return;
        element = rootElement.querySelectorAll(elementName);
    }

    return element;
}

/**
 * 根据内容获取element
 */
const fetchElementByText = async (elementName, text) => {
    let elements = await document.querySelectorAll(elementName);
    if (elements.length == 0)
        return

    let rElement = Array.from(elements).find(el => el.textContent === text);
    return rElement;
}

/**
 * 根据内容获取element的element
 */
const fetchElementByTextInElement = async (mainElement, elementName, text) => {
    let elements = await mainElement.querySelectorAll(elementName);
    if (elements.length == 0)
        return

    for (let element of elements) {
        if (element.innerText === text)
            return element;
    }

    return
}

/**
 * 在文本框或长文本框中输入文字，并触发元素的input方法
 * @param {HTMLInputElement | HTMLTextAreaElement} element 
 * @param {string} text 
 */
const fillTextOnInputOrTextarea = (element, text) => {
    element.value = text;
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
}

/**
 * 关闭当前标签页
 */
const closeCurrentTab = () => {
    try {
        window.opener = window;
        var win = window.open("", "_self");
        win.close();
        //frame的时候
        top.close();
    } catch { }
}


/**
 * 阻止原页面打开新标签
 */
const preventPageOpenNewTab = () => {
    ContentMessageHelper.getInstance().callFromContentToInject(Constants.PREVENT_PAGE_OPEN_NEW_TAB_EVENT_TYPE);
}

/**
 * 恢复原页面打开新标签
 */
const recoverPageOpenNewTab = () => {
    ContentMessageHelper.getInstance().callFromContentToInject(Constants.RECOVER_PAGE_OPEN_NEW_TAB_EVENT_TYPE);
}

/**
 * 下载链接, 下载并得到为Blob
 * @param {string} url 文件链接
 * @param {string} filename 文件名称
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
const urlToBlob = async (url, filename) => {
    const { xhr, response: blob } = await requestByXhr(url, "GET", undefined, undefined, "blob");
    if (!filename) {
        console.log("blob", blob);
        let contentDisposition = xhr.getResponseHeader("content-disposition") || "";
        let filenameRegex = ${/filename[^;=\n]*=((['"]).*?{\2}|[^;\n]*)/};
        let matches = filenameRegex.exec(contentDisposition);
        if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    return { blob, filename };
}

/**
 * 自动匀速滚动
 * @param {number} gap 间隔px(数值越高越快)
 * @param {HTMLElement} parentElement 父元素
 * @param {number} targetTop 目标scrollTop
 */
const intervalScroll = async (gap = 50, parentElement = document.documentElement, targetTop) => {
    return new Promise(rs => {
        const scroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = parentElement;
            if (scrollHeight <= clientHeight) return;
            targetTop = targetTop || scrollHeight;
            if (scrollTop + clientHeight === scrollHeight) {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                rs();
            } else {
                parentElement.scrollTo({ left: 0, top: scrollTop + gap, behavior: 'smooth' });
            }
        }
        let timer = setInterval(scroll, 100);
    })
}
`
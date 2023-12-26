const fs = require('fs');

// 遍历此文件夹里的js文件, 加载所有路由
const useRoutes = (app) => {
    fs.readdirSync(__dirname).forEach(file => {
        if (file === 'index.js') return // index.js文件不需要
        const router = require(`./${file}`)
        app.use(router.routes())
        app.use(router.allowedMethods())
    })
}

module.exports = useRoutes
const {app, BrowserWindow, dialog, ipcMain} = require('electron')
const path = require('path')
const {autoUpdater} = require('electron-updater')
const axios = require('axios')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hidden',
        titleBarOverlay: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    })

    // 开发环境下加载 Vite 开发服务器地址，生产环境下加载打包后的文件
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()
    if (app.isPackaged) {
        const baseUrl = process.env.UPDATE_BASE_URL
        if (baseUrl) {
            autoUpdater.setFeedURL({provider: 'generic', url: baseUrl})
        }
        autoUpdater.autoDownload = false
        autoUpdater.on('update-available', async () => {
            const r = await dialog.showMessageBox({
                type: 'info',
                buttons: ['下载并安装', '稍后'],
                defaultId: 0,
                cancelId: 1,
                title: '发现新版本',
                message: '有可用更新'
            })
            if (r.response === 0) {
                autoUpdater.downloadUpdate()
            }
        })
        autoUpdater.on('update-downloaded', async () => {
            const r = await dialog.showMessageBox({
                type: 'info',
                buttons: ['立即安装', '稍后'],
                defaultId: 0,
                cancelId: 1,
                title: '更新已下载',
                message: '是否现在安装更新？'
            })
            if (r.response === 0) {
                autoUpdater.quitAndInstall()
            }
        })
        setTimeout(() => {
            autoUpdater.checkForUpdates()
        }, 5000)
    }
    
    ipcMain.handle('http-request', async (_event, payload) => {
        const {method, url, params, data, headers} = payload || {}
        const mergedHeaders = Object.assign({
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'VolunteerDashboard-Electron'
        }, headers || {})
        try {
            const res = await axios({
                method: method || 'get',
                url,
                params,
                data,
                headers: mergedHeaders,
                withCredentials: true,
                validateStatus: () => true
            })
            return {status: res.status, data: res.data, headers: res.headers}
        } catch (e) {
            return {error: e && e.message ? e.message : 'request_failed'}
        }
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

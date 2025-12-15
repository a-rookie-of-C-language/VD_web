const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  request: (config) => ipcRenderer.invoke('http-request', config)
})

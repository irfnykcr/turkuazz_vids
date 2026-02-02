const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
	openVLC: (url) => ipcRenderer.invoke('open-vlc', url),
	onVLCStatus: (callback) => ipcRenderer.on('vlc-status', (event, status) => callback(status)),

	forceKillVLC: () => ipcRenderer.invoke('force-kill-vlc'),
	
	getEnv: () => ipcRenderer.invoke('get-env'),
})

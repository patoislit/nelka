const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.2.0',
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
});

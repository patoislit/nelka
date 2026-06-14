const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.3.4',
  // Ovládanie okna (vlastný titlebar)
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  onMaximized: (cb) => ipcRenderer.on('win:maximized', (_e, val) => cb(val)),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
});

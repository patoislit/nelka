const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0c0c0e',
    icon: path.join(__dirname, '../public/icons/icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Load app
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready (prevents white flash)
  win.once('ready-to-show', () => win.show());

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Custom menu
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ]}] : []),
    { label: 'Súbor', submenu: [
      isMac ? { role: 'close' } : { role: 'quit', label: 'Zavrieť' },
    ]},
    { label: 'Úpravy', submenu: [
      { role: 'undo', label: 'Späť' },
      { role: 'redo', label: 'Znovu' },
      { type: 'separator' },
      { role: 'cut', label: 'Vystrihnúť' },
      { role: 'copy', label: 'Kopírovať' },
      { role: 'paste', label: 'Vložiť' },
      { role: 'selectAll', label: 'Vybrať všetko' },
    ]},
    { label: 'Zobraziť', submenu: [
      { role: 'reload', label: 'Obnoviť' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Pôvodná veľkosť' },
      { role: 'zoomIn', label: 'Priblížiť' },
      { role: 'zoomOut', label: 'Oddialiť' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Celá obrazovka' },
    ]},
    { label: 'Okno', submenu: [
      { role: 'minimize', label: 'Minimalizovať' },
      { role: 'zoom' },
      ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : []),
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

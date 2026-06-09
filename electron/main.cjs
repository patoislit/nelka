const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';
const isMac = process.platform === 'darwin';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    // Mac: skryté tlačidlá, Windows: default frame
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    backgroundColor: '#0c0c0e',
    icon: path.join(__dirname, '../public/icons/icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // potrebné pre file:// protokol
    },
    show: false,
  });

  // Load app
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath).catch((err) => {
      console.error('Failed to load:', indexPath, err);
    });
  }

  // Zobraz okno keď je pripravené (bez bieleho/čierneho bliknutia)
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (isDev) win.webContents.openDevTools();
  });

  // Fallback — ak ready-to-show nespustí do 3 sekúnd, zobraz aj tak
  setTimeout(() => {
    if (!win.isVisible()) win.show();
  }, 3000);

  // Ak načítanie zlyhá — skús znova
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('did-fail-load:', errorCode, errorDescription);
    if (!isDev) {
      setTimeout(() => {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
      }, 1000);
    }
  });

  // Externé linky otvor v prehliadači
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function buildMenu() {
  if (!isMac) {
    // Windows / Linux — žiadne menu
    Menu.setApplicationMenu(null);
    return;
  }

  // Mac — minimálne menu (povinné pre Mac UX)
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'O aplikácii Nelka' },
        { type: 'separator' },
        { role: 'hide', label: 'Skryť Nelka' },
        { role: 'hideOthers', label: 'Skryť ostatné' },
        { type: 'separator' },
        { role: 'quit', label: 'Ukončiť Nelka' },
      ],
    },
    {
      label: 'Úpravy',
      submenu: [
        { role: 'undo', label: 'Späť' },
        { role: 'redo', label: 'Znovu' },
        { type: 'separator' },
        { role: 'cut', label: 'Vystrihnúť' },
        { role: 'copy', label: 'Kopírovať' },
        { role: 'paste', label: 'Vložiť' },
        { role: 'selectAll', label: 'Vybrať všetko' },
      ],
    },
    {
      label: 'Zobraziť',
      submenu: [
        { role: 'togglefullscreen', label: 'Celá obrazovka' },
      ],
    },
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
  if (!isMac) app.quit();
});

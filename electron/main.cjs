const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';
const isMac = process.platform === 'darwin';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    // Frameless v štýle Claude desktop — vlastný titlebar v appke.
    // Mac: skryté tlačidlá (traffic lights ostanú), Windows: úplne bez rámu.
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 13 } : undefined,
    roundedCorners: true,
    backgroundColor: '#0c0c0e',
    icon: path.join(app.getAppPath(), 'public/icons/icon-512.png'),
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // potrebné pre file:// protokol
    },
    show: false,
  });

  // ── Ovládanie okna z vlastného titlebaru (renderer) ──
  ipcMain.removeHandler?.('win:isMaximized');
  win.on('maximize', () => win.webContents.send('win:maximized', true));
  win.on('unmaximize', () => win.webContents.send('win:maximized', false));

  // Load app
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    // app.getAppPath() je spoľahlivejšie ako __dirname v ASAR balíkoch
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    console.log('Loading:', indexPath);
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

  // Fallback — ak ready-to-show nespustí do 5 sekúnd, zobraz aj tak
  setTimeout(() => {
    if (!win.isVisible()) win.show();
  }, 5000);

  // Ak načítanie zlyhá — zaznamenaj chybu, NEskúšaj znova (retry loop môže spôsobiť problém)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
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

  // Ovládanie okna z vlastného titlebaru
  ipcMain.on('win:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on('win:maximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize(); else w.maximize();
  });
  ipcMain.on('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

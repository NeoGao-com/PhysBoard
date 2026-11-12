/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function createMainWindow() {
  const win = new BrowserWindow({
    title: 'PhysBoard',
    width: 1366,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: '#FBFBFD',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Prevent accidental navigation away from the local offline bundle
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file://')) {
      return { action: 'allow' };
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });

  const indexPath = path.join(__dirname, '..', 'out', 'index.html');
  win.loadFile(indexPath);
  return win;
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('second-instance', () => {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

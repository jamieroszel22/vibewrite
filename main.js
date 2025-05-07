const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Vibe Write',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('new-file');
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Markdown', extensions: ['md', 'markdown'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (filePaths && filePaths[0]) {
                            const content = fs.readFileSync(filePaths[0], 'utf8');
                            mainWindow.webContents.send('file-opened', {
                                content,
                                path: filePaths[0]
                            });
                        }
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: async () => {
                        mainWindow.webContents.send('save-file');
                    }
                },
                {
                    label: 'Save As',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        const { filePath } = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'Markdown', extensions: ['md'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (filePath) {
                            mainWindow.webContents.send('save-file-as', filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Handle file write operation
ipcMain.on('write-file', (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        event.reply('file-saved');
    } catch (error) {
        console.error('Error saving file:', error);
        dialog.showErrorBox('Error', 'Failed to save file');
    }
});

// Handle save dialog request
ipcMain.on('show-save-dialog', async (event) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (filePath) {
        event.reply('save-file-as', filePath);
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
}); 
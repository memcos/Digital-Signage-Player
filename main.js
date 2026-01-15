const { app, BrowserWindow, screen, Tray, Menu, ipcMain, dialog, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

app.disableHardwareAcceleration(); 

const store = new Store();
let signageWindow = null;
let settingsWindow = null;
let tray = null;
let isQuitting = false;
let powerSaveId = null;

// Varsayılan Ayarlar
const defaultSettings = {
    language: 'tr', // YENİ: Varsayılan Dil
	monitorId: 1,
    signageFolder: '',
    durationImage: 15,
    showSettingsOnLaunch: true,
    autoStart: true,
    orientation: 'landscape',
    // --- KORUMA AYARI (YENİ) ---
    preventMainScreen: false, // Eğer true ise ve 2. ekran yoksa oynatıcıyı açmaz
    // --- BAR AYARLARI ---
    showInfoBar: true,
    CompanyName: 'FİRMA İSMİ',
    barColor: '#198754',
    barOpacity: 100,
    scrollSpeed: 20,
    messageList: [{ text: 'Sağlıklı günler dileriz...', active: true }],
    // --- SES AYARLARI ---
    audioMuted: false,       
    audioVolume: 80,         
    audioDeviceId: 'default',
    // --- LİSTE ---
    manualList: [],
    sharedListPath: ''
};

// --- EKRAN YÖNETİMİ ---
function checkAndCreateSignage() {
    const config = store.get('config', defaultSettings);
    const displays = screen.getAllDisplays();

    // KORUMA MODU AKTİF Mİ?
    if (config.preventMainScreen) {
        // Eğer sistemde sadece 1 ekran varsa (Ana ekran)
        if (displays.length <= 1) {
            console.log("Koruma Modu: 2. Ekran bulunamadı, oynatıcı başlatılmıyor.");
            // Eğer açık pencere varsa kapat (Ana ekrana kaymasın diye)
            if (signageWindow) {
                signageWindow.close();
                signageWindow = null;
            }
            return; // Fonksiyondan çık, pencere açma
        }
    }

    // Ekran varsa veya koruma kapalıysa pencereyi oluştur
    createSignageWindow();
}

function createSignageWindow() {
    if (signageWindow) return; // Zaten açıksa tekrar açma

    const displays = screen.getAllDisplays();
    const config = store.get('config', defaultSettings);
    
    // Hedef ekranı belirle
    let targetDisplay = displays[config.monitorId];
    if (!targetDisplay) {
        // Seçili ekran yoksa:
        if (config.preventMainScreen && displays.length > 1) {
            // Koruma açıksa ve başka ekran varsa, 2. sıradakini (index 1) al
            targetDisplay = displays[1];
        } else if (!config.preventMainScreen) {
            // Koruma kapalıysa ana ekranı kullan
            targetDisplay = displays[0];
        } else {
            // Koruma açık ve uygun ekran yok
            return;
        }
    }

    signageWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        kiosk: true,
        skipTaskbar: true,
        title: "Digital Ekran Player",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            backgroundThrottling: false
        }
    });

    signageWindow.loadFile('views/signage.html');

    signageWindow.on('closed', () => {
        signageWindow = null;
        // Eğer kullanıcı çıkış yapmadıysa ve koruma modundaysak,
        // ekran kontrolü yaparak tekrar açmayı dene (3 sn sonra)
        if (!isQuitting) {
            setTimeout(checkAndCreateSignage, 3000);
        }
    });
}

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.show();
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 1000,
        height: 850,
        title: "Digital Ekran Yönetim Paneli",
        icon: path.join(__dirname, 'assets/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWindow.loadFile('views/settings.html');

    settingsWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            settingsWindow.hide();
        }
    });

    settingsWindow.on('closed', () => { settingsWindow = null; });
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets/icon.png');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Yönetim Paneli', click: () => createSettingsWindow() },
        { label: 'Oynatıcıyı Başlat/Yenile', click: () => checkAndCreateSignage() }, // Manuel tetikleme
        { type: 'separator' },
        { label: 'Çıkış', click: () => { isQuitting = true; app.quit(); }}
    ]);

    tray.setToolTip('Digital Ekran Yöneticisi');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createSettingsWindow());
}

app.whenReady().then(() => {
    powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
    const config = store.get('config', defaultSettings);
    
    // Migration
    if(config.preventMainScreen === undefined) {
        store.set('config', { ...config, preventMainScreen: false });
    }
    if(!config.audioDeviceId) {
        store.set('config', { ...config, audioMuted: false, audioVolume: 80, audioDeviceId: 'default' });
    }

    app.setLoginItemSettings({ openAtLogin: config.autoStart, path: app.getPath('exe') });
    
    // İLK BAŞLATMA KONTROLÜ
    checkAndCreateSignage();
    
    createTray();
    if (config.showSettingsOnLaunch) createSettingsWindow();

    // --- EKRAN OLAYLARI (HOT-PLUG) ---
    // Ekran Takıldığında:
    screen.on('display-added', () => {
        console.log("Yeni ekran algılandı. Oynatıcı kontrol ediliyor...");
        // Biraz bekle ki Windows ekranı tam tanısın
        setTimeout(checkAndCreateSignage, 2000);
    });

    // Ekran Çıkarıldığında:
    screen.on('display-removed', () => {
        console.log("Ekran çıkarıldı. Kontrol ediliyor...");
        const config = store.get('config');
        // Eğer koruma açıksa ve ekran sayısı 1'e düştüyse kapat
        if (config.preventMainScreen && screen.getAllDisplays().length <= 1) {
            if (signageWindow) signageWindow.close();
        }
    });
});

// IPC HANDLERS
ipcMain.handle('select-folder', async () => { const r = await dialog.showOpenDialog(settingsWindow, { properties: ['openDirectory'] }); return r.filePaths[0]; });
ipcMain.handle('select-file', async () => { const r = await dialog.showOpenDialog(settingsWindow, { properties: ['openFile'], filters: [{ name: 'Medya', extensions: ['jpg', 'png', 'mp4', 'webm', 'jpeg'] }] }); return r.filePaths[0]; });
ipcMain.handle('select-shared-folder', async () => { const r = await dialog.showOpenDialog(settingsWindow, { properties: ['openDirectory'], title: 'Ortak Liste Klasörünü Seçin' }); return r.filePaths[0]; });

ipcMain.on('export-list', (event, listData) => {
    dialog.showSaveDialog(settingsWindow, { title: 'Yedekle (Dışa Aktar)', defaultPath: 'ekran_yedek.json', filters: [{ name: 'JSON', extensions: ['json'] }] }).then(file => { if (!file.canceled && file.filePath) fs.writeFileSync(file.filePath, JSON.stringify(listData, null, 2)); });
});

ipcMain.handle('import-list', async () => {
    const r = await dialog.showOpenDialog(settingsWindow, { title: 'Yedek Yükle (İçe Aktar)', filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] });
    if (!r.canceled && r.filePaths.length > 0) { try { return JSON.parse(fs.readFileSync(r.filePaths[0], 'utf-8')); } catch (e) { return null; } } return null;
});

ipcMain.on('save-settings', (event, newSettings) => {
    store.set('config', newSettings);
    if (newSettings.sharedListPath) {
        try { fs.writeFileSync(path.join(newSettings.sharedListPath, 'shared_playlist.json'), JSON.stringify({ updatedAt: new Date(), manualList: newSettings.manualList }, null, 2)); } catch (e) { console.error(e); }
    }
    app.setLoginItemSettings({ openAtLogin: newSettings.autoStart, path: app.getPath('exe') });
    
    // Ayarlar değişince ekran durumunu tekrar kontrol et (Belki koruma açıldı/kapandı)
    if (signageWindow) signageWindow.close(); // Kapatıp yeniden açmak en temizidir
    setTimeout(checkAndCreateSignage, 1000);
    
    if (settingsWindow) settingsWindow.hide();
});

ipcMain.on('get-settings', (event) => {
    let config = store.get('config', defaultSettings);
    if (config.sharedListPath) {
        const sharedFile = path.join(config.sharedListPath, 'shared_playlist.json');
        if (fs.existsSync(sharedFile)) { try { const d = JSON.parse(fs.readFileSync(sharedFile, 'utf-8')); config.manualList = d.manualList; } catch (e) { console.error(e); } }
    }
    event.reply('settings-data', config);
});

// --- DİL DOSYASI OKUMA (YENİ) ---
ipcMain.handle('get-locale', async (event, lang) => {
    // locales klasörünün yolunu belirle
    const localePath = path.join(__dirname, 'locales', lang + '.json');
    try {
        if (fs.existsSync(localePath)) {
            const data = fs.readFileSync(localePath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.error("Dil dosyası bulunamadı:", localePath);
            return null;
        }
    } catch (error) {
        console.error("Dil okuma hatası:", error);
        return null;
    }
});

app.on('window-all-closed', (e) => e.preventDefault());
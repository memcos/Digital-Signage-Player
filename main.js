const { app, BrowserWindow, screen, Tray, Menu, ipcMain, dialog, powerSaveBlocker, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

app.disableHardwareAcceleration(); 

const store = new Store();
let signageWindow = null;
let settingsWindow = null;
let ibanFormWindow = null;
let ibanQrWindow = null;
let cropOverlayWindow = null;
let cropPublishWindow = null;
let cropControlWindow = null;
let croppedImageData = null;
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
    sharedListPath: '',
    // --- IBAN AYARLARI ---
    ibanList: [],
    ibanShortcut: 'Ctrl+Shift+Q',
    // --- KIRP & YAYINLA AYARLARI ---
    cropShortcut: 'Ctrl+Shift+Y'
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
        { label: 'Oynatıcıyı Başlat/Yenile', click: () => checkAndCreateSignage() },
        { type: 'separator' },
        { label: 'IBAN ile Ödeme Al', click: () => openIbanPayment() },
        { label: 'Kırp & Yayınla', click: () => openCropOverlay() },
        { type: 'separator' },
        { label: 'Çıkış', click: () => { isQuitting = true; app.quit(); }}
    ]);

    tray.setToolTip('Digital Ekran Yöneticisi');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createSettingsWindow());
}

// --- IBAN ÖDEME PENCERE YÖNETİMİ ---
function openIbanPayment() {
    if (ibanFormWindow) {
        ibanFormWindow.show();
        ibanFormWindow.focus();
        return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0]; // Birinci monitör

    ibanFormWindow = new BrowserWindow({
        width: 560,
        height: 580,
        x: primaryDisplay.bounds.x + Math.round((primaryDisplay.bounds.width - 560) / 2),
        y: primaryDisplay.bounds.y + Math.round((primaryDisplay.bounds.height - 580) / 2),
        title: 'IBAN ile Ödeme Al',
        icon: path.join(__dirname, 'assets/icon.png'),
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ibanFormWindow.loadFile('views/iban-payment.html');

    ibanFormWindow.on('closed', () => {
        ibanFormWindow = null;
    });
}

function openIbanQrWindow(qrData) {
    // QR penceresini ikinci monitörde aç
    const displays = screen.getAllDisplays();
    let targetDisplay;

    if (displays.length > 1) {
        // İkinci monitörü bul (signage window'un olduğu monitör veya index 1)
        const config = store.get('config', defaultSettings);
        targetDisplay = displays[config.monitorId] || displays[1];
    } else {
        // Tek monitör varsa ana ekranı kullan
        targetDisplay = displays[0];
    }

    if (ibanQrWindow) {
        ibanQrWindow.close();
        ibanQrWindow = null;
    }

    ibanQrWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        title: 'IBAN QR Ödeme',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ibanQrWindow.loadFile('views/iban-qr.html');

    // QR verilerini pencere hazır olunca gönder
    ibanQrWindow.webContents.on('did-finish-load', () => {
        ibanQrWindow.webContents.send('qr-data', qrData);
    });

    ibanQrWindow.on('closed', () => {
        ibanQrWindow = null;
    });
}


// --- KIRP & YAYINLA YÖNETİMİ ---
let fullScreenImageData = null;

async function openCropOverlay() {
    if (cropOverlayWindow) return; // Zaten açıksa tekrar açma

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];

    try {
        let sources = await desktopCapturer.getSources({ 
            types: ['screen'], 
            thumbnailSize: { 
                width: primaryDisplay.size.width * primaryDisplay.scaleFactor, 
                height: primaryDisplay.size.height * primaryDisplay.scaleFactor 
            }
        });

        let primarySource = sources[0];

        // Eğer görüntü çok büyük gelip Chromium tarafından reddedildiyse (boş döndüyse)
        // Güvenli boyutta (scaleFactor olmadan) tekrar dene
        if (!primarySource || primarySource.thumbnail.isEmpty()) {
            console.log("Ölçekli görüntü alınamadı, standart boyut deneniyor...");
            sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { 
                    width: primaryDisplay.size.width, 
                    height: primaryDisplay.size.height 
                }
            });
            primarySource = sources[0];
        }

        if (primarySource) {
            fullScreenImageData = primarySource.thumbnail.toDataURL();
        }
    } catch (e) {
        console.error("Ekran görüntüsü alınamadı (try-catch), güvenli mod deneniyor:", e);
        try {
            const fallbackSources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { 
                    width: primaryDisplay.size.width, 
                    height: primaryDisplay.size.height 
                }
            });
            if (fallbackSources[0]) {
                fullScreenImageData = fallbackSources[0].thumbnail.toDataURL();
            }
        } catch (err) {
            console.error("Güvenli mod da başarısız:", err);
            fullScreenImageData = null;
        }
    }

    cropOverlayWindow = new BrowserWindow({
        x: primaryDisplay.bounds.x,
        y: primaryDisplay.bounds.y,
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        transparent: false, // Artık saydam değil, çünkü ekran görüntüsünü sabitleyeceğiz
        skipTaskbar: true,
        alwaysOnTop: true,
        resizable: false,
        title: 'Ekran Kırpma Aracı',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    cropOverlayWindow.loadFile('views/crop-overlay.html');

    cropOverlayWindow.on('closed', () => {
        cropOverlayWindow = null;
        fullScreenImageData = null;
    });
}

function openCropPublish(imageData) {
    if (cropPublishWindow) {
        cropPublishWindow.close();
        cropPublishWindow = null;
    }

    const displays = screen.getAllDisplays();
    let targetDisplay = displays.length > 1 ? displays[1] : displays[0];

    cropPublishWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        title: 'Kırpılmış Ekran',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    cropPublishWindow.loadFile('views/crop-publish.html');
    
    cropPublishWindow.on('closed', () => {
        cropPublishWindow = null;
        croppedImageData = null;
    });

    // Kontrol penceresini aç
    openCropControl();
}

function openCropControl() {
    if (cropControlWindow) {
        cropControlWindow.show();
        return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];

    cropControlWindow = new BrowserWindow({
        width: 300,
        height: 120,
        x: primaryDisplay.bounds.x + Math.round((primaryDisplay.bounds.width - 300) / 2),
        y: primaryDisplay.bounds.y + 50, // Üstten biraz boşluk
        title: 'Yayın Kontrolü',
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    cropControlWindow.loadFile('views/crop-control.html');

    cropControlWindow.on('closed', () => {
        cropControlWindow = null;
    });
}

function closeCrop() {
    if (cropOverlayWindow) { cropOverlayWindow.close(); cropOverlayWindow = null; }
    if (cropPublishWindow) { cropPublishWindow.close(); cropPublishWindow = null; }
    if (cropControlWindow) { cropControlWindow.close(); cropControlWindow = null; }
}

ipcMain.on('publish-crop', (event, imageData) => {
    croppedImageData = imageData;
    if (cropOverlayWindow) {
        cropOverlayWindow.close();
        cropOverlayWindow = null;
    }
    openCropPublish(imageData);
});

ipcMain.handle('get-cropped-image', () => {
    return croppedImageData;
});

ipcMain.handle('get-fullscreen-image', () => {
    return fullScreenImageData;
});

ipcMain.on('cancel-crop', () => {
    closeCrop();
});

ipcMain.on('close-crop', () => {
    closeCrop();
});

function registerShortcuts() {
    // Mevcut kısayolları temizle
    globalShortcut.unregisterAll();

    const config = store.get('config', defaultSettings);
    
    // IBAN Kısayolu
    const ibanSc = config.ibanShortcut || 'Ctrl+Shift+Q';
    const electronIbanSc = ibanSc.replace(/Ctrl/gi, 'CommandOrControl').replace(/Alt/gi, 'Alt');
    
    // Kırpma Kısayolu
    const cropSc = config.cropShortcut || 'Ctrl+Shift+Y';
    const electronCropSc = cropSc.replace(/Ctrl/gi, 'CommandOrControl').replace(/Alt/gi, 'Alt');

    try {
        globalShortcut.register(electronIbanSc, () => { openIbanPayment(); });
    } catch (e) { console.error('IBAN kısayol kayıt hatası:', e.message); }

    try {
        globalShortcut.register(electronCropSc, () => { openCropOverlay(); });
    } catch (e) { console.error('Crop kısayol kayıt hatası:', e.message); }
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
    registerShortcuts();
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
    
    // Kısayolları güncelle
    registerShortcuts();
    
    // Ayarlar değişince ekran durumunu tekrar kontrol et
    if (signageWindow) signageWindow.close();
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

// --- IBAN IPC HANDLERS ---
ipcMain.on('get-iban-list', (event) => {
    const config = store.get('config', defaultSettings);
    event.reply('iban-list-data', { ibanList: config.ibanList || [] });
});

ipcMain.on('generate-iban-qr', (event, data) => {
    openIbanQrWindow(data);
});

ipcMain.on('close-iban-payment', () => {
    if (ibanFormWindow) {
        ibanFormWindow.close();
        ibanFormWindow = null;
    }
});

ipcMain.on('resize-iban-payment', (event, { width, height }) => {
    if (ibanFormWindow) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const workArea = primaryDisplay.workArea;
        
        let targetHeight = height;
        if (targetHeight > workArea.height * 0.9) {
            targetHeight = Math.floor(workArea.height * 0.9);
        }
        
        ibanFormWindow.setContentSize(width, targetHeight);
        ibanFormWindow.center();
    }
});

ipcMain.on('close-iban-qr', () => {
    if (ibanQrWindow) {
        ibanQrWindow.close();
        ibanQrWindow = null;
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => e.preventDefault());
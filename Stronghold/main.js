const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('node:path');

let window;
let tabs = [];
let activeTabTracker = -1;

// Layout logic to generate the views
function layout(view) {
    if(!window || window.isDestroyed() || !view) {
        return;
    }
        
    const [width, height] = window.getContentSize();
    view.setBounds({ x: 0, y: 145, width: width, height: height - 145});
}


// Tab Stuff
function createTab() {
    const newTab = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    newTab.webContents.loadFile(path.join('html/home.html'));
    tabs.push(newTab);
    switchTab(tabs.length - 1);
    window.webContents.send('change-location', '');

    newTab.webContents.on('will-navigate', async (event, url) => {
        if(url.startsWith('http://')) {
            event.preventDefault();
            await newTab.webContents.loadFile(path.join(__dirname, 'html/httpBlocked.html'));
        }
    })

    newTab.webContents.on('will-redirect', async (event, url) => {
        if(url.startsWith('http://')) {
            event.preventDefault();
            await newTab.webContents.loadFile(path.join(__dirname, 'html/httpBlocked.html'));
        }
    })

    newTab.webContents.on('did-start-navigation', (_e, url, isInPlace, isMainFrame) => {
        if(isMainFrame) {
            let displayURL = '';

            if(url.includes('home.html')) {
                displayURL = '';
            }

            else if(url.includes('dashboard.html')) {
                displayURL = 'stronghold/dashboard';
            }

            else if(url.includes('settings.html')) {
                displayURL = 'stronghold/settings';
            }

            else if(url.includes('httpBlock.html')) {
                displayURL = 'stronghold/blocked';
            }

            else {
                displayURL = url;
            }

            window.webContents.send('change-location', displayURL);
        }
    });

    newTab.webContents.on('page-title-updated', (_e, title) => {
        if(window && !window.isDestroyed()) {
            window.setTitle(`Stronghold - ${title}`);
        }
    });

    window.webContents.send('tabs:update', {
        tabNumber: tabs.length,
        activeTab: activeTabTracker
    });
}

function switchTab(tracker) {
    if(tracker < 0 || tracker >= tabs.length) {
        return;
    }

    if(activeTabTracker !== -1) {
        window.removeBrowserView(tabs[activeTabTracker]);
    }

    activeTabTracker = tracker;

    const view = tabs[activeTabTracker];
    window.setBrowserView(view);
    layout(view);

    const currentURL = view.webContents.getURL();
    if(currentURL && currentURL.includes('home.html')) {
        window.webContents.send('change-location', '');
    } 

    else if(currentURL.includes('dashboard.html')) {
        window.webContents.send('change-location', 'stronghold/dashboard');
    }

    else if(currentURL.includes('settings.html')) {
        window.webContents.send('change-location', 'stronghold/settings');
    }

    else if(currentURL.includes('httpBlock.html')) {
        window.webContents.send('change-location', 'stronghold/blocked');
    }
    
    else {
        window.webContents.send('change-location', currentURL);
    }

    window.webContents.send('tabs:update', {
        tabNumber: tabs.length,
        activeTab: activeTabTracker
    });
}

function closeTab() {

}

function activeTab() {
    if(activeTabTracker === -1 || !tabs[activeTabTracker]) {
        createTab();
    }

    return tabs[activeTabTracker];
}

ipcMain.handle('tabs:new-tab', () => createTab());
ipcMain.handle('tabs:switch-tab', (_e, tabID) => switchTab(tabID));


// Creates the window which the browser will be displayed in 
function createWindow() {
    window = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Stronghold',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    // Starts the project in a localhost server -> Needed for Google OAUTH to work since it cannot take inputs from file://
    window.loadURL('http://localhost:1000/html/startup.html');

    window.on('resize', () => {
        if(activeTabTracker !== -1) {
            layout(tabs[activeTabTracker]);
        }
    });
}

app.whenReady().then(createWindow);


// Checks to see if the input is a URL or not
function isURL(input) {
    const validEndings = /\.(com|co\.uk|org|net|edu|gov|uk)$/i;
    const trimmedInput = input.trim().toLowerCase();

    if(trimmedInput.includes(" ")) {
        return false;
    }

    if(!validEndings.test(trimmedInput)) {
        return false;
    }

    if(!trimmedInput.includes('.')) {
        return false;
    }

    return true;
}


// Adds https:// to the beginning of an entered URL if it does not have it (if isURL returns true)
function addHTTPS(input) {
    try {
        if(!/^https?:\/\//i.test(input)) {
            return new URL('https://' + input).toString();
        }

        else {
            return new URL(input).toString();
        }

    } catch {
        return null;
    }
}


// Builds a search query if isURL returns false
function buildSearchQuery(input) {
    const searchQuery = encodeURIComponent(input.trim());
    return `https://www.google.com/search?q=${searchQuery}`;

}

// Check for HTTP to block it
function isHTTP(input) {
    const http = 'http://';
    const trimmedInput = input.trim().toLowerCase();
    
    if(trimmedInput.startsWith(http)) {
        return true;
    }

    return false;
}

// Domain Name Check
function checkDomainName(input) {
    try {
        let score = 0;
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase();
        const ipFormat = /^\d{1,3}(\.\d{1,3}){3}$/;
        const phishingWords = ['login', 'secure', 'verification'];
        const dotCount = (domainName.match(/\./g)).length;

        // Contains phishing words
        if(phishingWords.some(word => domainName.includes(word))) {
            score += 10;
        }

        // Repeated hyphens
        if(domainName.includes('--')) {
            score += 5;
        }

        // Long domain name
        if(domainName.length > 50) {
            score += 10;
        }

        // Domain is IP address
        if(ipFormat.test(domainName)) {
            score += 25;
        }

        // Homograph attacks -> Browsers represent unicode as 'xn--'
        if(domainName.includes('xn--')) {
            score += 25;
        }

        // Includes '@' symbol
        if(input.includes('@')) {
            score += 10;
        }

        // Multiple dots
        if(dotCount > 3) {
            score += 15;
        }

        return {
            name: 'Domain Name Check',
            score
        }
    }

    catch {
        return {
            name: 'Domain Name Check',
            score: 100
        };
    }
}

// DNS Check


// TLS Certificate Validation


// Domain Age Check


// Security Header Check


// Redirect Analysis


// Typoscript Check - Needs Levenshtein Distance Algorith and an array of Known Domains


// Overall Risk Score




// Search Bar + Navigation Buttons
ipcMain.handle('navigate:goto', async (_e, raw) => {
    if(!raw.trim()) {
        return {
            okay: false,
            error: 'No Input'
        };
    }

    else if(isHTTP(raw)) {
        await tabs[activeTabTracker].webContents.loadFile(path.join(__dirname, 'html/httpBlock.html'));

        return {
            okay: true
        }
    }

    else if(isURL(raw)) {    
        const url = addHTTPS(raw);

        await tabs[activeTabTracker].webContents.loadURL(url);
        return {
            okay: true,
            url
        };
    }
    
    else {
        const search = buildSearchQuery(raw);

        await tabs[activeTabTracker].webContents.loadURL(search);
        return {
            okay: true,
            search
        };
    }
});

ipcMain.handle('navigate:back', () => {
    const view = activeTab();

    if(view.webContents.navigationHistory.canGoBack()) { 
        view.webContents.navigationHistory.goBack();
    }
});

ipcMain.handle('navigate:forward', () => {
    const view = activeTab();

    if(view.webContents.navigationHistory.canGoForward()) {
        view.webContents.navigationHistory.goForward();
    }
});

ipcMain.handle('navigate:reload', () => {
    const view = activeTab();
    view.webContents.reload();
});

ipcMain.handle('navigate:home', () => {
    const view = activeTab();
    view.webContents.loadFile(path.join('html/home.html'));
});

ipcMain.handle('navigate:login', async () => {
    await window.loadFile('html/taskbar.html');
    createTab();
})

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') {
        app.quit();
    }
})



// Dashboard Stuff
function dashboard() {

}

ipcMain.handle('navigate:dashboard', async (_e) => {
    const html = 'html/dashboard.html' 
    await tabs[activeTabTracker].webContents.loadFile(html);
    return {
        okay: true,
        html
    }
})



// Settings Stuff
function settings() {

}

ipcMain.handle('navigate:settings', async (_e) => {
    const html = 'html/settings.html'
    await tabs[activeTabTracker].webContents.loadFile(html);
    return {
        okay: true,
        html
    }
})



// Bookmarks Stuff
function bookmarks() { 

}



// Downloads Stuff
const blockedExtensions = /\.(exe|cmd|ps1|msi)$/i;;
const recentDownloads = [];

function downloadToBeBlocked(file) {
    if(blockedExtensions.test(file.toLowerCase())) {
        return true;
    }

    else {
        return false;
    }
}

app.whenReady().then(() => {
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const file = item.getFilename();
        const saveLocation = app.getPath('downloads');
        const fullSaveLocation = path.join(saveLocation, file);
        item.setSavePath(fullSaveLocation);

        if(downloadToBeBlocked(filename)) {
            item.cancel();
        }

        

    });
});
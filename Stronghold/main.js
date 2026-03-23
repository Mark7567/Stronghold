const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('node:path');
const whois = require('whois-json');

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

    const tabStorage = {
        view: newTab,
        title: 'Home Page'
    }

    newTab.webContents.loadFile(path.join('html/home.html'));
    tabs.push(tabStorage);
    switchTab(tabs.length - 1);
    window.webContents.send('change-location', '');

    newTab.webContents.on('will-navigate', async (event, url) => {
        if(url.startsWith('http://')) {
            event.preventDefault();
            await newTab.webContents.loadFile(path.join(__dirname, 'html/blocked.html'));
        }
    })

    newTab.webContents.on('will-redirect', async (event, url) => {
        if(url.startsWith('http://')) {
            event.preventDefault();
            await newTab.webContents.loadFile(path.join(__dirname, 'html/blocked.html'));
        }
    })

    newTab.webContents.on('did-start-navigation', (_e, url, _iip, isMainFrame) => {
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

            else if(url.includes('blocked.html')) {
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

        updateTabName(newTab);
    });

    newTab.webContents.on('did-finish-load', () => {
        updateTabName(newTab);
    });

    newTab.webContents.on('did-navigate', () => {
        updateTabName(newTab);
    });

    updateTabInfo();
}

function switchTab(tracker) {
    if(tracker < 0 || tracker >= tabs.length) {
        return;
    }

    if(activeTabTracker !== -1) {
        window.removeBrowserView(tabs[activeTabTracker].view);
    }

    activeTabTracker = tracker;

    const view = tabs[activeTabTracker].view;
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

    else if(currentURL.includes('blocked.html')) {
        window.webContents.send('change-location', 'stronghold/blocked');
    }
    
    else {
        window.webContents.send('change-location', currentURL);
    }

    updateTabInfo();
}

function closeTab(tabIndex) {
    if(tabIndex < 0 || tabIndex >= tabs.length) {
        return;
    }

    const closingActiveTab = tabIndex === activeTabTracker;
    
    window.removeBrowserView(tabs[tabIndex].view);
    tabs[tabIndex].view.webContents.destroy();
    tabs.splice(tabIndex, 1);

    if(tabs.length === 0) {
        activeTabTracker = -1;
        createTab();
        return;
    }

    if(closingActiveTab) {
        if(activeTabTracker >= tabs.length) {
            activeTabTracker = tabs.length - 1;
        }

        else {
            activeTabTracker = tabIndex;
        }
    }

    else if(tabIndex < activeTabTracker) {
        activeTabTracker--;
    }   

    switchTab(activeTabTracker);
    updateTabInfo();
}

function activeTab() {
    if(activeTabTracker === -1 || !tabs[activeTabTracker]) {
        createTab();
    }

    return tabs[activeTabTracker].view;
}

function updateTabInfo() {
    const tabInfo = tabs.map((tab, index) => ({
        index: index,
        title: tab.title,
        active: index === activeTabTracker
    }));

    window.webContents.send('tabs:update', {
        tabs: tabInfo,
        activeTab: activeTabTracker
    });
}

function updateTabName(view) {
    const tabIndex = tabs.findIndex(tab => tab.view === view);
    
    if(tabIndex === -1) {
        return;
    }
    
    let title = view.webContents.getTitle();

    if(!title || title.includes('Stronghold')) {
        const url = view.webContents.getURL();

        if(url.includes('home')) {
            title = 'Home';
        }

        else if(url.includes('dashboard')) {
            title = 'Dashboard';
        }

        else if(url.includes('settings')) {
            title = 'Settings';
        }
    }

    tabs[tabIndex].title = title;
    updateTabInfo();
}

ipcMain.handle('tabs:new-tab', () => createTab());
ipcMain.handle('tabs:switch-tab', (_e, tabID) => switchTab(tabID));
ipcMain.handle('tabs:close-tab', (_e, tabID) => closeTab(tabID));


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
            layout(tabs[activeTabTracker].view);
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


// HTTP Check - RISK SCORE
function checkHTTP(input) {
    try {
        let score = 0;
        const formatURL = new URL(input.trim());
        
        if(formatURL.protocol === 'http:') {
            score += 10;
        }

        console.log(score); // Testing - Can Remove

        return {
            name: 'HTTP Check',
            score
        }
    }

    catch {
        return {
            name: 'HTTP Check',
            score: 100
        } 
    }
}


// Domain Name Check - RISK SCORE
function checkDomainName(input) {
    try {
        let score = 0;
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase();
        const ipFormat = /^\d{1,3}(\.\d{1,3}){3}$/;
        const phishingWords = ['login', 'secure', 'verification']; // Kinda basic rn - Need to add more
        const dotCount = (domainName.match(/\./g)).length;

        // Contains phishing words?
        if(phishingWords.some(word => domainName.includes(word))) {
            score += 10;
        }

        // Repeated hyphens?
        if(domainName.includes('--')) {
            score += 5;
        }

        // Long domain name?
        if(domainName.length > 50) {
            score += 10;
        }

        // Domain is IP address?
        if(ipFormat.test(domainName)) {
            score += 25;
        }

        // Homograph attack? -> Browsers represent unicode as 'xn--'
        if(domainName.includes('xn--')) {
            score += 25;
        }

        // Includes '@' symbol?
        if(input.includes('@')) {
            score += 10;
        }

        // Multiple dots?
        if(dotCount > 3) {
            score += 15;
        }

        console.log(score); // Testing - Can Remove

        return {
            name: 'Domain Name Check',
            score
        }
    }

    catch {
        return {
            name: 'Domain Name Check',
            score: 200
        };
    }
}


// TLS Certificate Validation - RISK SCORE
app.on('certificate-error', (event, _wc, _url, _e, _c, validCert) => {
    event.preventDefault();
    validCert(false);
});


// Domain Age Check - RISK SCORE
async function checkDomainAge(input) {
    try {
        let score = 0;
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase();
        const whoIsResult = await whois(domainName);

        const createdDate = new Date(whoIsResult.creationDate);
        const todayDate = new Date();
        const age = (
            (todayDate - createdDate) / (1000 * 60 * 60 * 24) 
        ); 

        if(age <= 30) {
            score += 50;
        }

        else if(age <= 90 && age > 30) {
            score += 25;
        }

        else if(age <= 365 && age > 90) {
            score += 10;
        }

        // Testing - Can Remove
        else if(age > 365) {
            score += 100;
        }

        console.log(score); // Testing - Can Remove

        return{ 
            name: 'Domain Age Check',
            score
        }
    }

    catch {
        return {
            name: 'Domain Age Check',
            score: 300
        }
    }
}


// Security Header Check - RISK SCORE
async function checkSecurityHeader(input) {
    try {
        let score = 0;

        const fetchedResponse = await fetch(input, {method: 'GET'});
        const responseHeaders = fetchedResponse.headers;

        if(responseHeaders.has('x-frame-options')) {
            score = 1;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-xss-protection')) {
            score = 2;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-content-type-options')) {
            score = 3;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('referrer-policy')) {
            score = 4;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('content-type')) {
            score = 5;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('set-cookie')) {
            score = 6;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('strict-transport-security')) {
            score = 7;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('expect-ct')) {
            score = 8;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('content-security-policy')) {
            score = 9;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('access-control-allow-origin')) {
            score = 10;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('cross-origin-opener-policy')) {
            score = 11;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('cross-origin-embedder-policy')) {
            score = 12;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('cross-origin-resource-policy')) {
            score = 13;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('permissions-policy') || responseHeaders.has('feature-policy')) {
            score = 14;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('server')) {
            score = 15;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-powered-by')) {
            score = 16;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-aspnet-version')) {
            score = 17;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-aspnetmvc-version')) {
            score = 18;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-robots-tag')) {
            score = 19;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('x-dns-prefetch-control')) {
            score = 20;
            console.log(score); // Testing - Can Remove
        }

        if(responseHeaders.has('public-key-pins')) {
            score = 21;
            console.log(score); // Testing - Can Remove
        }

        return {
            name: 'Security Header Check',
            score
        }
    }

    catch {
        return {
            name: 'Security Header Check',
            score: 400
        }
    }
}

// Redirect Analysis - RISK SCORE


// Typoscript Check - Needs Levenshtein Distance Algorith and an array of Known Domains - RISK SCORE


// DNS Check - RISK SCORE


// Overall Risk Score
function riskScore(input) {
    let score = 0;
    
    score += checkHTTP(input);
    score += checkDomainName(input);
    score += checkDomainAge(input);
    score += checkSecurityHeader(input);

    console.log(score); // Testing - Can Remove

    return score;
}


// Search Bar + Navigation Buttons
ipcMain.handle('navigate:goto', async (_e, raw) => {
    if(!raw.trim()) {
        return {
            okay: false,
            error: 'No Input'
        };
    }

    else if(isURL(raw)) {    
        const url = addHTTPS(raw);
        riskScore(raw);

        await tabs[activeTabTracker].view.webContents.loadURL(url);
        return {
            okay: true,
            url
        };
    }
    
    else {
        const search = buildSearchQuery(raw);

        await tabs[activeTabTracker].view.webContents.loadURL(search);
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
    await tabs[activeTabTracker].view.webContents.loadFile(html);
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
    await tabs[activeTabTracker].view.webContents.loadFile(html);
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
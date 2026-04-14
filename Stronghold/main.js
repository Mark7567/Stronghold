const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('node:path');
const whois = require('whois-json');
const damerauLevenshtein = require('talisman/metrics/damerau-levenshtein');
const { knownDomains, blockedExtensions, phishingWords, validEndings, warnedExtensions } = require('./lists');
const { parse } = require('tldts');
const { start } = require('node:repl');

let window;
let tabs = [];
let activeTabTracker = -1;
let recentDownloads = [];
let userProtectionLevel = 'normal';
let userDownloadLevel = 'normal';
let userTheme = 'light';
let userPin = null;
let userStartPage = 'home_page';
let currentUser = null;

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

    newTab.webContents.openDevTools();

    const tabStorage = {
        view: newTab,
        title: 'Home Page',
        pendingURL: null
    }

    newTab.webContents.loadURL(getStartPage(userStartPage));
    tabs.push(tabStorage);
    switchTab(tabs.length - 1);
    window.webContents.send('change-location', '');

    newTab.overrideRiskScore = null;

    newTab.webContents.on('will-navigate', async (event, url, _iip, isMainFrame) => {
        if(!isMainFrame) {
            return;
        }

        const inputURL = normaliseURL(url);
        const outputURL = normaliseURL(newTab.overrideRiskScore);

        console.log(inputURL);
        console.log(outputURL);
        console.log(inputURL === outputURL);
        
        if(outputURL && inputURL === outputURL) {
            newTab.overrideRiskScore = null;
            return;
        }

        event.preventDefault();
        await navigationOnceChecked(newTab, url);
    });

    newTab.webContents.on('will-redirect', async (event, url, _iip, isMainFrame) => {
        if(!isMainFrame) {
            return;
        }
        
        const inputURL = normaliseURL(url);
        const outputURL = normaliseURL(newTab.overrideRiskScore);

        console.log(inputURL);
        console.log(outputURL);
        console.log(inputURL === outputURL);
        
        if(outputURL && inputURL === outputURL) {
            newTab.overrideRiskScore = null;
            return;
        }

        event.preventDefault();
        await navigationOnceChecked(newTab, url);
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

            else if(url.includes('warned.html')) {
                displayURL = 'stronghold/warning'
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

    newTab.webContents.on('did-fail-load', (_e, errorCode, _eD, _vURL, isMainFrame) => {
        if(errorCode === -3 || errorCode === -2) {
            return;
        }

        if(!isMainFrame) {
            return;
        }
    })

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

app.whenReady().then(async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
        storages: ['appcache', 'shadercache', 'serviceworkers', 'cachestorage']
    });

    downloadHandler();
    createWindow();
});

// Checks to see if the input is a URL or not
function isURL(input) {
    const trimmedInput = input.trim().toLowerCase();
    const removeProtocol = trimmedInput.replace(/^https?:\/\//, "");
    const baseHost = removeProtocol.split(/[/?#]/)[0];


    if(trimmedInput.includes(" ")) {
        return false;
    }

    if(!baseHost.includes('.')) {
        return false;
    }

    if(!validEndings.some(ending => baseHost.endsWith(ending))) {
        return false;
    }

    return true;
}

// Adds https:// to the beginning of an entered URL if it does not have it (if isURL returns true)
function addHTTPS(input) {
    try {
        const trimmedInput = input.trim();

        if(/^https?:\/\//i.test(trimmedInput)) {
            return new URL(trimmedInput).toString();
        }

        return new URL(`https://${trimmedInput}`).toString();

    } catch {
        return null;
    }
}

// Builds a search query if isURL returns false
function buildSearchQuery(input) {
    const searchQuery = encodeURIComponent(input.trim());
    return `https://www.google.com/search?q=${searchQuery}`;

}

function normaliseURL(input) {
    try {
        return new URL(input).toString();
    }

    catch {
        return input;
    }
}

// HTTP Check - RISK SCORE
function checkHTTP(input) {
    let score = 0;
    
    try {
        const formatURL = new URL(input.trim());
        
        if(formatURL.protocol === 'http:') {
            score += 20;
        }

        console.log(score); // Testing - Can Remove

        return score;
    }

    catch {
        return score;
    }
}

// Domain Name Check - RISK SCORE
function checkDomainName(input) {
    let score = 0;

    try {
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase();
        const ipFormat = /^\d{1,3}(\.\d{1,3}){3}$/;
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
            score += 30;
        }

        // Homograph attack? -> Browsers represent unicode as 'xn--'
        if(domainName.includes('xn--')) {
            score += 30;
        }

        // Includes '@' symbol?
        if(input.includes('@')) {
            score += 20;
        }

        // Multiple dots?
        if(dotCount > 3) {
            score += 5;
        }

        return score;
    }

    catch {
        return score;
    }
}

// TLS Certificate Validation - RISK SCORE
app.on('certificate-error', (event, _wc, _url, _e, _c, validCert) => {
    event.preventDefault();
    validCert(false);
});

// Domain Age Check - RISK SCORE
async function checkDomainAge(input) {
    let score = 0;
    
    try {
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase();
        const whoIsResult = await whois(domainName);

        const createdDate = new Date(whoIsResult.creationDate);
        const todayDate = new Date();
        const age = (
            (todayDate - createdDate) / (1000 * 60 * 60 * 24) 
        ); 

        if(age <= 30) {
            score += 20;
        }

        else if(age <= 90 && age > 30) {
            score += 10;
        }

        else if(age <= 365 && age > 90) {
            score += 5;
        }

        return score;
    }

    catch {
        return score;
    }
}

// Security Header Check - RISK SCORE
async function checkSecurityHeader(input) {
    let score = 0;
    
    try {
        const fetchedResponse = await fetch(input, {method: 'GET'});
        const responseHeaders = fetchedResponse.headers;

        if(!responseHeaders.has('x-frame-options')) {
            score += 5;
        }

        if(!responseHeaders.has('x-xss-protection')) {
            score += 2;
        }

        if(!responseHeaders.has('x-content-type-options')) {
            score += 5;
        }

        if(!responseHeaders.has('referrer-policy')) {
            score += 2;
        }

        if(!responseHeaders.has('strict-transport-security')) {
            score += 10;
        }

        if(!responseHeaders.has('content-security-policy')) {
            score += 10;
        }

        if(!responseHeaders.has('cross-origin-opener-policy')) {
            score += 2;
        }

        if(!responseHeaders.has('cross-origin-embedder-policy')) {
            score += 2;
        }

        if(!responseHeaders.has('cross-origin-resource-policy')) {
            score += 2;
        }

        if(!responseHeaders.has('permissions-policy') && !responseHeaders.has('feature-policy')) {
            score += 2;
        }

        return score;
    }

    catch {
        return score;
    }
}

// Typosquatting Check - RISK SCORE
function typosquattingCheck(input) {
    let score = 0;
    
    try {
        const formatURL = new URL(input);
        const domainName = formatURL.hostname.toLowerCase().replace(/^www\./, '');
        const domainSplit = domainName.split('.');
        const host = parse(domainName).domainWithoutSuffix;

        if(typeof host === 'string' && host.length > 0) {
            if(knownDomains.includes(host)) {
                return score;
            }

            for(const trustedDomain of knownDomains) {
                const distance = damerauLevenshtein(host, trustedDomain);

                if(distance === 1) {
                    score = Math.max(score, 30);
                    console.log('Distance Check: ', score);
                }

                else if(distance === 2) {
                    score = Math.max(score, 15);
                    console.log('Distance Check: ', score);
                }
            }
        }

        for(const subDomain of domainSplit) {
            if(subDomain === host) {
                continue;
            }

            if(typeof subDomain !== 'string') {
                continue;
            }

            for(const trustedDomain of knownDomains) {
                const distance = damerauLevenshtein(subDomain, trustedDomain);

                if(distance === 1) {
                    score = Math.max(score, 30);
                    console.log('Distance Check: ', score);
                }

                else if(distance === 2) {
                    score = Math.max(score, 15);
                    console.log('Distance Check: ', score);
                }
            }
        }

        return score;
    }

    catch {
        return score;
    }
}

// Overall Risk Score
async function riskScore(input) {
    let score = 0;
    let action = 'allow';
    
    score += checkHTTP(input);
    score += checkDomainName(input);
    score += await checkDomainAge(input);
    score += await checkSecurityHeader(input);
    score += typosquattingCheck(input);

    const {warnScore, blockScore} = getProtectionLevel(userProtectionLevel);

    if(score >= blockScore) {
        action = 'block';
    }

    else if(score >= warnScore) {
        action = 'warn';
    }

    return {
        score,
        action
    };
}

// Search Bar + Navigation Buttons
ipcMain.handle('navigate:goto', async (_e, raw) => {
    if(!raw.trim()) {
        return {
            okay: false,
            error: 'No Input'
        };
    }

    const view = activeTab();

    if(isURL(raw)) {    
        const url = addHTTPS(raw);

        if(!url) {
            return {
                okay: false,
                error: 'Invalid URL'
            };
        }

        const result = await navigationOnceChecked(view, url);

        return {
            okay: true,
            result
        }
    }
    
    else {
        const search = buildSearchQuery(raw);
        view.overrideRiskScore = normaliseURL(search);

        try {
            await view.webContents.loadURL(search);
        }

        catch(e) {
            const errorMessage = String(e);

            if(!errorMessage.includes('ERR_ABORTED') && !errorMessage.includes('ERR_FAILED')) {
                console.log(e)
            }
        }

        return {
            okay: true,
            search
        }
    }
});

async function checkOnLinkClick(view, input) {
    const formatURL = addHTTPS(input);
    const toBlock = await riskScore(formatURL);
    const tab = tabs.find(tab => tab.view === view);

    if(toBlock.action === 'block') {
        if(tab) {
            tab.pendingURL = null;
        }

        await view.webContents.loadURL('http://localhost:1000/html/blocked.html');
        return {
            action: 'block',
            score: toBlock.score
        };
    }

    else if(toBlock.action === 'warn') {
        if(tab) {
            tab.pendingURL = formatURL;
        }

        await view.webContents.loadURL('http://localhost:1000/html/warned.html');
        return {
            action: 'warn',
            score: toBlock.score,
            url: formatURL
        };
    }

    if(tab) {
        tab.pendingURL = null;
    }

    return {
        action: 'accept',
        score: toBlock.score,
        url: formatURL
    }
}

async function navigationOnceChecked(view, input) {
    const block = await checkOnLinkClick(view, input);

    if(block.action === 'accept') {
        view.overrideRiskScore = normaliseURL(block.url);
        
        try {
            await view.webContents.loadURL(block.url);
        }

        catch(e) {
            const errorMessage = String(e);

            if(errorMessage.includes('ERR_ABORTED') || errorMessage.includes('ERR_FAILED')) {
                return block;
            }
        }
    }

    return block;
}

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
    view.webContents.loadURL('http://localhost:1000/html/home.html');
});

ipcMain.handle('navigate:login', async () => {
    await window.loadURL('http://localhost:1000/html/taskbar.html');
    createTab();
});

app.on('window-all-closed', async () => {
    await session.defaultSession.clearStorageData();;

    if(process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    await session.defaultSession.clearStorageData();
});

ipcMain.handle('navigate:continue', async () => {
    const view = activeTab();
    const tab = tabs[activeTabTracker];

    if(!tab || !tab.pendingURL) {
        return {
            okay: false
        }
    }

    const pendingURL = tab.pendingURL;
    tab.pendingURL = null;
    view.overrideRiskScore = pendingURL;

    try {
        await view.webContents.loadURL(pendingURL);
        return {
            okay: true
        };
    }

    catch {
        console.log('Continue Failed :(')

        return {
            okay: false
        };
    }
});

ipcMain.handle('navigate:leave', () => {
    const view = activeTab();

    if(view.webContents.navigationHistory.canGoBack()) { 
        view.webContents.navigationHistory.goBack();
    }
});

// Dashboard Stuff
function dashboard() {

}

ipcMain.handle('navigate:dashboard', async (_e) => {
    const html = 'http://localhost:1000/html/dashboard.html' 
    await tabs[activeTabTracker].view.webContents.loadURL(html);
    return {
        okay: true,
        html
    }
})

// Settings Stuff
ipcMain.handle('navigate:settings', async (_e) => {
    const html = 'http://localhost:1000/html/settings.html'
    await tabs[activeTabTracker].view.webContents.loadURL(html);

    return {
        okay: true,
        html
    }
})

ipcMain.handle('settings:protection-level', (_e, protectionLevel) => {
    if(currentUser === null) {
        return {
            okay: false
        };
    }
    
    userProtectionLevel = protectionLevel;
    return {
        okay: true
    };
});

ipcMain.handle('settings:download-level', (_e, downloadLevel) => {
    if(currentUser === null) {
        return {
            okay: false
        };
    }
    
    userDownloadLevel = downloadLevel;
    return {
        okay: true
    };
});

ipcMain.handle('settings:set-theme', (_e, theme) => {
    if(currentUser === null) {
        return {
            okay: false
        };
    }
    
    userTheme = theme;
    
    if(window && !window.isDestroyed()) {
        window.webContents.send('change-theme', userTheme);
    }

    tabs.forEach((tab) => {
        if(tab.view && tab.view.webContents) {
            tab.view.webContents.send('change-theme', userTheme);
        }
    });
    
    return {
        okay: true
    };
});

ipcMain.handle('settings:get-theme', () => {
    return userTheme;
});

ipcMain.handle('settings:start-page', (_e, startPage) => {
    if(currentUser === null) {
        return {
            okay: false
        };
    }
    
    userStartPage = startPage;
    return {
        okay: true
    };
});

ipcMain.handle('user:set-user', (_e, userData) => {
    currentUser = userData;
    return {
        okay: true
    };
});

ipcMain.handle('user:get-user', () => {
    return {
        user: currentUser
    };
});

ipcMain.handle('user:clear-user', () => {
    currentUser = null;
    return { 
        okay: true
    };
});

// Downloads Stuff
function downloadToBeBlocked(file) {
    const fileName = file.trim().toLowerCase();
    const {extensionsToBlock, extensionsToWarn} = getDownloadLevel(userDownloadLevel);
    let action = 'allow';

    if(extensionsToBlock.some(extension => fileName.endsWith(extension))) {
        return {
            action: 'block'
        };
    }

    if(extensionsToWarn.some(extension => fileName.endsWith(extension))) {
        return {
            action: 'warn'
        };
    }

    return {
        action
    }
}

function downloadHandler() {
    session.defaultSession.on('will-download', (_e, item, _wC) => {
        const file = item.getFilename();

        if(downloadToBeBlocked(file).action === 'block') {
            item.cancel();
            return;
        }

        if(downloadToBeBlocked(file).action === 'warn') {
            item.cancel();
            return;
        }

        const saveLocation = app.getPath('downloads');
        const fullSaveLocation = path.join(saveLocation, file);
        item.setSavePath(fullSaveLocation);

        const downloadsRecord = {
            file,
            path: fullSaveLocation,
            url: item.getURL(),
            state: 'In Progress',
            startedAt: Date.now()
        };

        recentDownloads.unshift(downloadsRecord);

        item.on('updated', (_e, state) => {downloadsRecord.state = state;})
        item.once('done', (_e, state) => {downloadsRecord.state = state;});
    });
}

function getProtectionLevel(protectionLevel) {
    if(protectionLevel === 'strict') {
        return {
            warnScore: 25,
            blockScore: 50
        };
    }

    if(protectionLevel === 'normal') {
        return {
            warnScore: 75,
            blockScore: 100
        };
    }

    if(protectionLevel === 'warnOnly') {
        return {
            warnScore: 50,
            blockScore: 10000
        };
    }

    return {
        warnScore: 75,
        blockScore: 100
    };
}

function getDownloadLevel(downloadLevel) {
    if(downloadLevel === 'strict') {
        return {
            extensionsToBlock: [...blockedExtensions, ...warnedExtensions],
            extensionsToWarn: []
        };
    }

    if(downloadLevel === 'normal') {
        return {
            extensionsToBlock: blockedExtensions,
            extensionsToWarn: warnedExtensions
        };
    }

    if(downloadLevel === 'warnOnly') {
        return {
            extensionsToBlock: [],
            extensionsToWarn: [...blockedExtensions, ...warnedExtensions]
        };
    }

    return {
        extensionsToBlock: blockedExtensions,
        extensionsToWarn: warnedExtensions
    };
}

function getStartPage(startPage) {    
    if(startPage === 'dashboard') {
        return 'http://localhost:1000/html/dashboard.html';
    }

    return 'http://localhost:1000/html/home.html';
}
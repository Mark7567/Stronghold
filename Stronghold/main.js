const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
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

/*  Want a button in the top right corner which when clicked opens up a new tab with the dashboard
    Dashboard should show stats about user's safety protection
    Should also show XP points and stuff
    Needs some kind of cosmetic alteration
    Should have an option for user to create an account or sign into an existing account
    Needs a feature to use as a guest (potentially locks out of certain features)
    Is also where the quizzes / games / general gamification aspects can be found  */

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

/* Needs to add the current page to the bookmarks tab and allow the user to edit the name within the bookmarks
   Should change from empty to filled in when the page has been bookmarked to indicate such
   Just a pop-up in the top right corner under the taskbar - need to figure out how */

function bookmarks() { 

}



// Downloads Stuff

/* Needs to display current downloads from the browser
   Maybe add a time filter to show 1h, 6h, 24h, 3 month etc.
   Might have it clear after a set time limit which can be changed in settings to promote security
   Just a pop-up in the top right corner under the taskbar - need to figure out how
   Add extra features possibly to allow user to open file from clicking in downloads pop-up
   Open in a pop-up initially then have the option to open in a big screen (maybe show 5 in pop-up and all in big screen?) */

function downloads() {
    
}
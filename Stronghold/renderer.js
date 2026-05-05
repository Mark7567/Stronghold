/*
    Renderers for a variety of buttons that are used for click events
    Detect when a button is clicked and performs the relevant action from the 
        preload file
*/

const backButton = document.getElementById('back_button');
if(backButton) {
    backButton.addEventListener('click', () => {
        window.stronghold.back()
    });
}

const forwardButton = document.getElementById('forward_button');
if(forwardButton) {
    forwardButton.addEventListener('click', () => {
        window.stronghold.forward()}
    );
}

const reloadButton = document.getElementById('reload_button');
if(reloadButton) {
    reloadButton.addEventListener('click', () => {
        window.stronghold.reload()
    });
}

const homeButton = document.getElementById('home_button');
if(homeButton) {
    homeButton.addEventListener('click', () => {
        window.stronghold.home()
    });
}

const dashboardButton = document.getElementById('dashboard_button');
if(dashboardButton) {
    dashboardButton.addEventListener('click', () => {
        window.stronghold.dashboard()
    });
}

const newTabButton = document.getElementById('new_tab_button');
if(newTabButton) {
    newTabButton.addEventListener('click', () => {
        window.stronghold.newTab()
    });
}

const settingsButton = document.getElementById('settings_button');
if(settingsButton) {
    settingsButton.addEventListener('click', () => {
        window.stronghold.settings()
    });
}

const continueButton = document.getElementById('continue_button');
if(continueButton) {
    continueButton.addEventListener('click', () => {
        window.stronghold.continue()
    });
}

const leaveButton = document.getElementById('leave_button');
if(leaveButton) {
    leaveButton.addEventListener('click', () => { 
        window.stronghold.leave()
    });
}

const homeSearchButton = document.getElementById('search_button');
const homeSearchInput = document.getElementById('search_input');
if(homeSearchButton && homeSearchInput) {
    homeSearchButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const input = homeSearchInput.value.trim();

        if(!input) {
            return;
        }

        await window.stronghold.goto(input);
    });
}

const searchAlgorithm = document.getElementById('navigation');
if(searchAlgorithm) {
    searchAlgorithm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputVal = e.target.querySelector('input');
        const val = inputVal.value.trim();
        const res = await window.stronghold.goto(val);

        if(!val) {
            return;
        }

        if(!res?.okay) {
            alert(res.error || 'Navigation Failure');
        }
    });
}

function showTabs(tabs, _aT) {
    const tabHolder = document.getElementById('tabs_holder');
    tabHolder.innerHTML = '';

    tabs.forEach((tabData) => {
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.dataset.tabNumber = tabData.index;

        if(tabData.active) {
            tab.classList.add('active_tab')
        }
        
        const name = document.createElement('span');
        name.classList.add('tab_name');
        name.textContent = tabData.title;

        const closeTabButton = document.createElement('button');
        closeTabButton.classList.add('close_tab_button');
        closeTabButton.textContent = 'X';

        if(tab) {
            tab.addEventListener('click', () => {
                window.stronghold.switchTab(tabData.index);
            });
        }

        if(closeTabButton) {
            closeTabButton.addEventListener('click', (e) => {
                e.stopPropagation(); 
                window.stronghold.closeTab(tabData.index);
            });
        }
        
        tab.appendChild(name);
        tab.appendChild(closeTabButton);
        tabHolder.appendChild(tab);
    });
}

window.addEventListener('updateTabs', (e) => {
    const {tabs, activeTab} = e.detail;
    showTabs(tabs, activeTab);
})

const urlInput = document.getElementById('url');

if(urlInput) {
    window.stronghold.onLocationChange((url) => {
        urlInput.value = url || '';
    });
}


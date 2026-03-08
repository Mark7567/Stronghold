const backButton = document.getElementById('back_button');
if(backButton) {
    backButton.addEventListener('click', () => window.stronghold.back());
}

const forwardButton = document.getElementById('forward_button');
if(forwardButton) {
    forwardButton.addEventListener('click', () => window.stronghold.forward());
}

const reloadButton = document.getElementById('reload_button');
if(reloadButton) {
    reloadButton.addEventListener('click', () => window.stronghold.reload());
}

const homeButton = document.getElementById('home_button');
if(homeButton) {
    homeButton.addEventListener('click', () => window.stronghold.home());
}

const dashboardButton = document.getElementById('dashboard_button');
if(dashboardButton) {
    dashboardButton.addEventListener('click', () => window.stronghold.dashboard());
}

const newTabButton = document.getElementById('new_tab_button');
if(newTabButton) {
    newTabButton.addEventListener('click', () => window.stronghold.newTab());
}

const settingsButton = document.getElementById('settings_button');
if(settingsButton) {
    settingsButton.addEventListener('click', () => window.stronghold.settings());
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

window.stronghold.onLocationChange((url) => {
    urlInput.value = url || '';
});


function showTabs(tabNumber) {
    const tabHolder = document.getElementById('tabs_holder');
    tabHolder.innerHTML = '';

    for(let i = 0; i < tabNumber; i++) {
        const tab = document.createElement('div');
        
        tab.dataset.tabNumber = i;
        tab.addEventListener('click', (e) => {
            const tabID = Number(e.currentTarget.dataset.tabNumber);
            window.stronghold.switchTab(tabID);
        });
        
        
        tabHolder.appendChild(tab);
    }
}

window.addEventListener('updateTabs', (e) => {
    const {tabNumber, activeTab} = e.detail;
    showTabs(tabNumber, activeTab);
})

const urlInput = document.getElementById('url');

if(urlInput) {
    window.stronghold.onLocationChange((url) => {
        urlInput.value = url || '';
    });
}


/* Allows for the user to set their own theme and makes sure it
    applies across all pages */

async function initialiseTheme() {
    try {
        const theme = await window.stronghold.getTheme();
        applyTheme(theme);

        window.stronghold.onThemeChange((themeChanged) => {
            applyTheme(themeChanged);
        });
    }

    catch(e) {
        console.error(e);
    }
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
}

if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseTheme);
} 

else {
    initialiseTheme();
}
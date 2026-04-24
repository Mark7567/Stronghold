const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stronghold', {
    goto: (url) => ipcRenderer.invoke('navigate:goto', url),
    back: () => ipcRenderer.invoke('navigate:back'),
    forward: () => ipcRenderer.invoke('navigate:forward'),
    reload: () => ipcRenderer.invoke('navigate:reload'),
    home: () => ipcRenderer.invoke('navigate:home'),
    onLocationChange: (cb) => ipcRenderer.on('change-location', (_e, url) => cb(url)),
    dashboard: () => ipcRenderer.invoke('navigate:dashboard'),
    newTab: () => ipcRenderer.invoke('tabs:new-tab'),
    switchTab: (tabID) => ipcRenderer.invoke('tabs:switch-tab', tabID),
    settings: () => ipcRenderer.invoke('navigate:settings'),
    login: () => ipcRenderer.invoke('navigate:login'),
    closeTab: (tabID) => ipcRenderer.invoke('tabs:close-tab', tabID),
    continue: () => ipcRenderer.invoke('navigate:continue'),
    leave: () => ipcRenderer.invoke('navigate:leave'),
    protectionLevel: (protectionLevel) => ipcRenderer.invoke('settings:protection-level', protectionLevel),
    downloadLevel: (downloadLevel) => ipcRenderer.invoke('settings:download-level', downloadLevel),
    setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),
    getTheme: () => ipcRenderer.invoke('settings:get-theme'),
    onThemeChange: (cb) => ipcRenderer.on('change-theme', (_e, theme) => cb(theme)),
    startPage: (startPage) => ipcRenderer.invoke('settings:start-page', startPage),
    setUser: (userData) => ipcRenderer.invoke('user:set-user', userData),
    getUser: () => ipcRenderer.invoke('user:get-user'),
    clearUser: () => ipcRenderer.invoke('user:clear-user'),
    onSecurityEvent: (cb) => ipcRenderer.on('security-event', (_e, action) => cb(action)),
    getStats: () => ipcRenderer.invoke('dashboard:get-stats')
});

ipcRenderer.on('tabs:update', (_e, data) => {
    window.dispatchEvent(new CustomEvent('updateTabs', {detail: data}));
});
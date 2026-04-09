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
    protectionLevel: (protectionLevel) => ipcRenderer.invoke('settings:protection-level', protectionLevel) 
});

ipcRenderer.on('tabs:update', (_e, data) => {
    window.dispatchEvent(new CustomEvent('updateTabs', {detail: data}));
});
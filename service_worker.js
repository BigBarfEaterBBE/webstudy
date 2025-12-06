/*
service_worker.js:
 - sets timer every min
 - locks browser
 - blocks from opening other tabs
 - stores prev tabs
 - unlockes browser when done
*/
const LOCK_INTERVAL_MINUTES = 1;

chrome.runtime.onInstalled.addListener(() => { // change this to when extension turned on
    chrome.alarms.create("ankiLock", { periodInMinutes: LOCK_INTERVAL_MINUTES});
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "ankiLock") {
        lockBrowser();
    }
});

let isLocked = false;
let savedTabs = [];

//block all navigation when locked
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (isLocked && !details.url.includes("study.html")) {
        chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL("study.html")
        });
    }
});

//trigger lock screen
async function lockBrowser() {
    isLocked = true;

    //save user tabs
    let tabs = await chrome.tabs.query({ currentWindow: true });
    savedTabs = tabs.map(t => t.url);

    //close all but one
    for (let i = 1; i < tabs.length; i++) {
        chrome.tabs.remove(tabs[i].id);
    }

    //redirect to lock screen
    chrome.tabs.update(tabs[0].id, {
        url: chrome.runtime.getURL("study.html")
    });
}

//unlock + restore prev tabs
async function unlockBrowser() {
    isLocked = false;
    const currentTabs = await chrome.tabs.query({ currentWindow: true });
    
    //restore tabs except current lock tab
    savedTabs.forEach((url) => {
        chrom.tabs.create({ url});
    });

    savedTabs = [];
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg === "unlock") unlockBrowser();
});
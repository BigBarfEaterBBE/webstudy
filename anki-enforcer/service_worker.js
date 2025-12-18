/*
service_worker.js:
 - sets timer every min
 - locks browser
 - blocks from opening other tabs
 - stores prev tabs
 - unlockes browser when done
*/
const LOCK_INTERVAL_MINUTES = 1;

let lockEnabled = true;
let isLocked = false;
let savedTabs = [];
let studyTabId;
let studyPort = null;

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "study-session") {
        console.log("study port conencted");
        studyPort = port;
        port.onDisconnect.addListener(() => {
            console.log("study port disconnected");
            studyPort = null;
        });
        port.onMessage.addListener((msg) => {
            if (msg.type === "unlock") {
                console.log("unlock msg recieved via port");
                unlockBrowser();
            }
        });
    }
});


const MIN_STARTUP_DELAY = LOCK_INTERVAL_MINUTES * 60 * 1000

function createAnkiAlarm() {
    chrome.alarms.clearAll(() => {
        chrome.alarms.create("ankiLock", {
            delayInMinutes: LOCK_INTERVAL_MINUTES,
            periodInMinutes: LOCK_INTERVAL_MINUTES
        });
        console.log("Anki lock alarm created");
    });
}


chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ extensionStartTime: Date.now() });
    //reset state
    isLocked = false;
    savedTabs = [];
    studyTabId = null;
    createAnkiAlarm();

    console.log("Startup complete. Locks enabled after grace period.")
});

chrome.runtime.onInstalled.addListener(() => {
    isLocked = false;
    savedTabs = [];
    studyTabId = null;
    createAnkiAlarm();
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "ankiLock") return;
    if (!lockEnabled) return;
    const { extensionStartTime } = await chrome.storage.local.get("extensionStartTime");
    if (!extensionStartTime) {
        console.log("no stored startup time - allowing lock");
        lockBrowser();
        return;
    }

    if (Date.now() - extensionStartTime < MIN_STARTUP_DELAY) {
        console.log("ignoring early alarm during startup");
        return;
    }

    lockBrowser();
});


//block all navigation when locked
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (isLocked && !details.url.includes("study.html")) {
        try{
            chrome.tabs.update(details.tabId, {
                url: chrome.runtime.getURL("study.html")
            });
        } catch (e) {
            console.warn("Navigation rejected, ignoring: ",e );
        }
    }
});

//trigger lock screen
async function lockBrowser() {
    isLocked = true;

    //save user tabs
    let tabs = await chrome.tabs.query({ currentWindow: true });
    savedTabs = tabs.map(t => t.url);

    //keep first tab as study tab
    const mainTab = tabs[0];

    //close all but one
    for (let i = 1; i < tabs.length; i++) {
        chrome.tabs.remove(tabs[i].id);
    }

    //redirect to lock screen
    chrome.tabs.update(mainTab.id, { url: chrome.runtime.getURL("study.html") });
    studyTabId = mainTab.id;
}

//unlock + restore prev tabs
async function unlockBrowser() {
    console.log("UNLOCKING BROWSER");
    isLocked = false;
    lockEnabled = false;
    chrome.alarms.clearAll();
    await chrome.storage.local.set({
        extensionStartTime: Date.now()
    });
    //restore tabs
    for (const url of savedTabs) {
        chrome.tabs.create({ url });
    }
    if (studyTabId) {
        chrome.tabs.remove(studyTabId);
        studyTabId = null;
    }

    savedTabs = [];
    setTimeout(() => {
        lockEnabled = true;
        createAnkiAlarm();
    }, 5000); //5s 
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "settingsUpdated") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes("study.html")) {
                    chrome.tabs.sendMessage(tab.id, msg);
                }
            });
        });
    }
    if (msg?.type === "unlock") {
        console.log("Unlock msg recieved");
        unlockBrowser();
        sendResponse({ ok: true });
        return true;
    }
})
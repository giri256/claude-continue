chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SET_ALARM") {
        const delayInMinutes = Math.max(0.1, (message.timestamp - Date.now()) / 60000);
        chrome.alarms.create("claudeLimitReset", { delayInMinutes });
    } else if (message.type === "CLEAR_ALARM") {
        chrome.alarms.clear("claudeLimitReset");
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "claudeLimitReset") {
        chrome.storage.local.get(['targetTimestamp'], (data) => {
            if (data.targetTimestamp && Date.now() >= data.targetTimestamp) {
                chrome.notifications.create("claudeReady", {
                    type: "basic",
                    iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23a855f7'/%3E%3C/svg%3E",
                    title: "Claude is Ready!",
                    message: "Time is up! Click here to open Claude and auto-resume your prompt.",
                    requireInteraction: true // Keeps notification on screen until clicked
                });
            }
        });
    }
});

// If the PC was off, the user can click the missed notification to open Claude
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "claudeReady") {
        chrome.tabs.create({ url: "https://claude.ai/" });
        chrome.notifications.clear(notificationId);
    }
});

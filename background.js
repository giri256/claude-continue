chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SET_ALARM") {
        const delayInMinutes = Math.max(0.1, (message.timestamp - Date.now()) / 60000);
        chrome.alarms.create("claudeLimitReset", { delayInMinutes });
        chrome.action.setBadgeText({ text: "" }); // Clear badge on set
    } else if (message.type === "TRIGGER_EXPIRED") {
        handleLimitExpired();
    } else if (message.type === "FORCE_EXECUTE") {
        executeNow();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "claudeLimitReset") {
        handleLimitExpired();
    } else if (alarm.name === "claudeForceExecute") {
        executeNow(); // 5 minutes passed, execute default
    }
});

function handleLimitExpired() {
    chrome.storage.local.get(['customPrompt', 'customImages', 'status'], (data) => {
        if (data.status === 'waiting') {
            const promptText = (data.customPrompt || "").trim();
            const hasImages = (data.customImages && data.customImages.length > 0);

            // If user provided a custom prompt OR images, execute IMMEDIATELY
            if (promptText.length > 0 || hasImages) {
                executeNow();
            } else {
                // If empty, enter 5-minute confirmation phase & show Badge Notification
                const confirmTimestamp = Date.now() + (5 * 60 * 1000);
                chrome.storage.local.set({
                    status: 'confirming',
                    confirmTimestamp: confirmTimestamp
                });

                chrome.alarms.create("claudeForceExecute", { delayInMinutes: 5 });

                // Extension Icon Badge Notification (replaces OS Desktop Notifications)
                chrome.action.setBadgeText({ text: "!" });
                chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // Red alert
            }
        }
    });
}

function executeNow() {
    chrome.alarms.clear("claudeForceExecute");
    chrome.action.setBadgeText({ text: "" }); // Clear badge when executing

    chrome.storage.local.get(['chatUrl'], (data) => {
        if (data.chatUrl) {
            chrome.storage.local.set({ pendingExecution: true, status: 'executing' });

            chrome.tabs.query({ url: "*://claude.ai/chat/*" }, (tabs) => {
                const targetPath = new URL(data.chatUrl).pathname;
                const existingTab = tabs.find(t => new URL(t.url).pathname === targetPath);

                if (existingTab) {
                    chrome.tabs.update(existingTab.id, { active: true });
                    chrome.windows.update(existingTab.windowId, { focused: true });
                } else {
                    chrome.tabs.create({ url: data.chatUrl });
                }
            });
        }
    });
}

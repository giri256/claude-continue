let popupInterval;
let storedImages = [];

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');

    // Load saved text and images
    chrome.storage.local.get(['customPrompt', 'customImages'], (data) => {
        if (data.customPrompt) promptInput.value = data.customPrompt;
        if (data.customImages) {
            storedImages = data.customImages;
            renderImages();
        }
    });

    // Auto-save text
    promptInput.addEventListener('input', (e) => {
        chrome.storage.local.set({ customPrompt: e.target.value });
    });

    // Handle Image Pasting
    promptInput.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imagePasted = false;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                imagePasted = true;
                const blob = item.getAsFile();
                const reader = new FileReader();

                reader.onload = (event) => {
                    const base64 = event.target.result;
                    storedImages.push(base64);
                    chrome.storage.local.set({ customImages: storedImages });
                    renderImages();
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    // Button Listeners
    document.getElementById('btn-resume').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "FORCE_EXECUTE" });
    });

    document.getElementById('btn-cancel').addEventListener('click', () => {
        chrome.storage.local.set({ status: 'idle' });
        chrome.alarms.clear("claudeForceExecute");
        chrome.action.setBadgeText({ text: "" }); // Clear notification badge
        updateUI();
    });

    updateUI();
    chrome.storage.onChanged.addListener(updateUI);
});

function renderImages() {
    const container = document.getElementById('image-preview-container');
    container.innerHTML = '';

    storedImages.forEach((base64, index) => {
        const div = document.createElement('div');
        div.className = 'img-preview';
        div.style.backgroundImage = `url(${base64})`;

        const del = document.createElement('div');
        del.className = 'img-delete';
        del.innerHTML = '✕';
        del.onclick = () => {
            storedImages.splice(index, 1);
            chrome.storage.local.set({ customImages: storedImages });
            renderImages();
        };

        div.appendChild(del);
        container.appendChild(div);
    });
}

function updateUI() {
    chrome.storage.local.get(['targetTimestamp', 'confirmTimestamp', 'status', 'chatUrl'], (data) => {
        const now = Date.now();
        const statusText = document.getElementById('status-text');
        const timeDisplay = document.getElementById('time-display');
        const timerLabel = document.getElementById('timer-label');
        const dot = document.getElementById('status-dot');
        const urlContainer = document.getElementById('url-container');
        const urlText = document.getElementById('url-text');
        const confirmActions = document.getElementById('confirm-actions');

        if (data.chatUrl) {
            urlContainer.style.display = "block";
            urlText.textContent = "Target: " + new URL(data.chatUrl).pathname.replace('/chat/', 'Chat #');
        } else {
            urlContainer.style.display = "none";
        }

        if (data.status === 'confirming' && data.confirmTimestamp > now) {
            statusText.textContent = "Notification Triggered";
            dot.className = "dot confirming";
            timeDisplay.style.display = "block";
            confirmActions.style.display = "flex";
            timerLabel.textContent = "Auto-sending default in:";
            startTick(data.confirmTimestamp);
        } else if (data.status === 'waiting' && data.targetTimestamp > now) {
            statusText.textContent = "Limit Reached";
            dot.className = "dot waiting";
            timeDisplay.style.display = "block";
            confirmActions.style.display = "none";
            timerLabel.textContent = "Limit resets in:";
            startTick(data.targetTimestamp);
        } else {
            statusText.textContent = "Monitoring Tabs";
            dot.className = "dot pulsing";
            timeDisplay.style.display = "none";
            confirmActions.style.display = "none";
            if (popupInterval) {
                clearInterval(popupInterval);
                popupInterval = null;
            }
        }
    });
}

function startTick(targetTime) {
    if (!popupInterval) popupInterval = setInterval(updateUI, 1000);
    const diff = targetTime - Date.now();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
    const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));
    document.getElementById('countdown').textContent =
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

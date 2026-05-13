let popupInterval;

function updateUI() {
    chrome.storage.local.get(['targetTimestamp'], (data) => {
        const now = Date.now();
        const statusText = document.getElementById('status-text');
        const timeDisplay = document.getElementById('time-display');
        const dot = document.querySelector('.dot');

        if (data.targetTimestamp && data.targetTimestamp > now) {
            statusText.textContent = "Limit reached. Waiting...";
            dot.className = "dot waiting";
            timeDisplay.style.display = "block";

            if (!popupInterval) {
                popupInterval = setInterval(updateUI, 1000);
            }

            const diff = data.targetTimestamp - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById('countdown').textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            statusText.textContent = "Monitoring active tabs...";
            dot.className = "dot pulsing";
            timeDisplay.style.display = "none";
            if (popupInterval) {
                clearInterval(popupInterval);
                popupInterval = null;
            }
        }
    });
}

// Start initialization
updateUI();

// Listen for live updates when background/content changes state
chrome.storage.onChanged.addListener((changes) => {
    if (changes.targetTimestamp) {
        updateUI();
    }
});

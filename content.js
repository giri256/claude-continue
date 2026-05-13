let observer = null;
let countdownInterval = null;
let targetTimestamp = null;

const PROMPT_TEXT = "continue, exactly from where you have paused, fully research and only then begin to write code";

function init() {
    chrome.storage.local.get(['targetTimestamp'], (data) => {
        if (data.targetTimestamp) {
            targetTimestamp = data.targetTimestamp;

            // FIX: Check if the time has ALREADY passed while the PC was off
            if (Date.now() >= targetTimestamp) {
                console.log("Claude Continue: Target time passed while offline. Executing now.");
                executeWhenReady();
            } else {
                // Time is still in the future
                startCountdown();
            }
        } else {
            startObserving();
        }
    });
}

// Safely waits for the DOM to load the chat input before executing
function executeWhenReady() {
    // Clear storage immediately so refreshing the page doesn't cause a loop
    chrome.storage.local.remove(['targetTimestamp']);
    chrome.runtime.sendMessage({ type: "CLEAR_ALARM" });

    const checkInterval = setInterval(() => {
        const inputBox = document.querySelector('[data-testid="chat-input"]');
        // Ensure the box exists and is interactive
        if (inputBox && inputBox.isContentEditable) {
            clearInterval(checkInterval);
            // Brief delay to ensure React has fully hydrated the component
            setTimeout(executePrompt, 1000);
        }
    }, 500);
}

// Watch DOM for the limit message
function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
        const timeStr = detectLimitMessage();
        if (timeStr) {
            observer.disconnect();
            targetTimestamp = parseTimeStr(timeStr);

            chrome.storage.local.set({ targetTimestamp });
            chrome.runtime.sendMessage({ type: "SET_ALARM", timestamp: targetTimestamp });

            startCountdown();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function detectLimitMessage() {
    const elements = document.querySelectorAll('.text-sm');
    for (const el of elements) {
        const text = el.textContent;
        if (text.includes("out of free") && text.includes("until")) {
            const match = text.match(/until\s+(\d{1,2}:\d{2}\s*[APMapm]{2})/);
            if (match) return match[1];
        }
    }
    return null;
}

function parseTimeStr(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return Date.now();

    let hours = parseInt(match[1]);
    let minutes = parseInt(match[2]);
    let isPM = match[3].toUpperCase() === 'PM';

    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    let targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    if (targetDate.getTime() < Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
}

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        if (Date.now() >= targetTimestamp) {
            clearInterval(countdownInterval);
            executeWhenReady();
        }
    }, 1000);
}

function executePrompt() {
    const inputBox = document.querySelector('[data-testid="chat-input"]');
    if (!inputBox) return;

    inputBox.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', PROMPT_TEXT);
    const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });
    inputBox.dispatchEvent(pasteEvent);

    setTimeout(() => {
        const sendBtn = document.querySelector('[aria-label="Send message"]');
        if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
        } else {
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
                const retryBtn = document.querySelector('[aria-label="Send message"]');
                if (retryBtn) retryBtn.click();
            }, 500);
        }

        // Resume monitoring after a few seconds
        setTimeout(startObserving, 5000);
    }, 800);
}

init();

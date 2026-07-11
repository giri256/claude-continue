let observer = null;
let isClickingToolLimit = false;
let toolLimitInterval = null;

function init() {
    chrome.storage.local.get(['targetTimestamp', 'status', 'pendingExecution', 'chatUrl'], (data) => {
        if (data.pendingExecution && data.chatUrl) {
            const targetPath = new URL(data.chatUrl).pathname;
            if (window.location.pathname === targetPath) {
                executeWhenReady();
                return;
            }
        }

        if (data.status === 'waiting' && data.targetTimestamp && Date.now() >= data.targetTimestamp) {
            chrome.runtime.sendMessage({ type: "TRIGGER_EXPIRED" });
        } else if (!data.status || data.status === 'waiting' || data.status === 'idle') {
            startObserving();
        }
    });
}

function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
        // 1. Check for tool-use banner
        detectAndClickToolUseContinue();

        // 2. Check for time limit message
        const timeStr = detectLimitMessage();
        if (timeStr) {
            observer.disconnect();
            const targetTimestamp = parseTimeStr(timeStr);
            chrome.storage.local.set({
                targetTimestamp: targetTimestamp,
                chatUrl: window.location.href,
                status: 'waiting'
            });
            chrome.runtime.sendMessage({ type: "SET_ALARM", timestamp: targetTimestamp });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// --- UPDATED: Wait for Main Send Button before clicking Banner Button ---
function detectAndClickToolUseContinue() {
    if (isClickingToolLimit) return;

    const banners = document.querySelectorAll('[data-testid="message-warning"]');
    let foundBanner = false;
    let continueBtn = null;

    for (const banner of banners) {
        if (banner.textContent.includes("tool-use limit")) {
            foundBanner = true;
            const buttons = banner.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.trim() === "Continue") {
                    continueBtn = btn;
                    break;
                }
            }
            break;
        }
    }

    if (foundBanner && continueBtn) {
        isClickingToolLimit = true;
        console.log("Claude Continue: Tool limit banner detected. Waiting for MAIN chat button to un-grey...");

        toolLimitInterval = setInterval(() => {
            // 1. Safety check: Did the banner vanish on its own?
            if (!document.body.contains(continueBtn)) {
                clearInterval(toolLimitInterval);
                isClickingToolLimit = false;
                return;
            }

            // 2. The True Source of Truth: The Main Chat Send (Up Arrow) Button
            const mainSendBtn = document.querySelector('[aria-label="Send message"]');

            if (mainSendBtn) {
                // Check if the main button is disabled via native prop or React attributes
                const isMainSendDisabled = mainSendBtn.disabled
                || mainSendBtn.getAttribute('aria-disabled') === 'true'
                || mainSendBtn.hasAttribute('data-disabled');

                if (!isMainSendDisabled) {
                    console.log("Claude Continue: Main Send button is active! Clicking the banner's Continue button.");
                    clearInterval(toolLimitInterval);

                    // Click the button inside the banner
                    continueBtn.click();

                    // 2-second cooldown before allowing new banner detection
                    setTimeout(() => { isClickingToolLimit = false; }, 2000);
                }
            }
        }, 500); // Check every half-second
    }
}
// --------------------------------------------------------

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
    let hours = parseInt(match[1]), minutes = parseInt(match[2]), isPM = match[3].toUpperCase() === 'PM';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    let targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);
    if (targetDate.getTime() < Date.now()) targetDate.setDate(targetDate.getDate() + 1);
    return targetDate.getTime();
}

function base64ToFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
}

function executeWhenReady() {
    chrome.storage.local.get(['customPrompt', 'customImages'], (data) => {
        const hasImages = (data.customImages && data.customImages.length > 0);
        const finalPrompt = (data.customPrompt && data.customPrompt.trim().length > 0)
        ? data.customPrompt.trim()
        : (hasImages ? " " : "continue");

        chrome.storage.local.remove(['pendingExecution', 'targetTimestamp', 'confirmTimestamp', 'status', 'chatUrl', 'customPrompt', 'customImages']);

        const checkInterval = setInterval(() => {
            const inputBox = document.querySelector('[data-testid="chat-input"]');
            if (inputBox && inputBox.isContentEditable) {
                clearInterval(checkInterval);

                window.scrollTo(0, document.body.scrollHeight);
                document.querySelectorAll('.overflow-y-auto').forEach(el => el.scrollTop = el.scrollHeight);
                inputBox.scrollIntoView({ behavior: "smooth", block: "end" });

                setTimeout(() => executePrompt(inputBox, finalPrompt, data.customImages), 800);
            }
        }, 500);
    });
}

function executePrompt(inputBox, textToSend, base64Images) {
    inputBox.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', textToSend);

    if (base64Images && base64Images.length > 0) {
        base64Images.forEach((base64, index) => {
            const file = base64ToFile(base64, `upload_${index}.png`);
            dataTransfer.items.add(file);
        });
    }

    const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });
    inputBox.dispatchEvent(pasteEvent);

    let retries = 0;
    const trySend = setInterval(() => {
        const sendBtn = document.querySelector('[aria-label="Send message"]');

        if (sendBtn && !sendBtn.disabled) {
            clearInterval(trySend);
            sendBtn.click();
            setTimeout(startObserving, 5000);
        } else if (++retries > 60) {
            clearInterval(trySend);
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
                const retryBtn = document.querySelector('[aria-label="Send message"]');
                if (retryBtn) retryBtn.click();
                startObserving();
            }, 500);
        }
    }, 500);
}

init();

chrome.storage.onChanged.addListener((changes) => {
    if (changes.pendingExecution && changes.pendingExecution.newValue === true) init();
});

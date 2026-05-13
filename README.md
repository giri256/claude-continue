# 🤖 Claude Continue

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-purple.svg)

**Claude Continue** is a modern, Manifest V3 Chrome Extension that solves the frustration of hitting Claude's message limits. Instead of manually checking the clock to see when your limit resets, this extension watches the timer for you.

When the exact reset time hits, the extension automatically types your resume prompt and hits send—even if you closed the tab or shut down your PC in the meantime!

## ✨ Features

*   **Zero-Sleep Precision:** Uses Chrome's MV3 Alarms API to track the reset time down to the millisecond without getting suspended by the browser.
*   **Offline/Restart Resilient:** If you shut down your PC and come back after the reset time has passed, the extension detects this, waits for the chat to load, and fires off the prompt immediately upon opening Claude.
*   **Smart Typing Simulation:** Injects text via React-compatible `ClipboardEvent` (paste) to reliably wake up ProseMirror and enable the send button.
*   **Glassmorphic UI:** A beautiful, dark-mode popup that gives you a live countdown timer with smooth pulsing status indicators.
*   **Missed Alarm Notifications:** If your browser is open in the background when the timer hits, it sends a desktop notification. Clicking it opens Claude and auto-resumes your work.

## 📝 The Prompt
By default, when the timer resets, the extension will automatically type and send:
> *"continue, exactly from where you have paused, fully research and only then begin to write code"*

## 🚀 Installation (Developer Mode)

Since this extension is not yet on the Chrome Web Store, you can install it locally in seconds:

1. Download or clone this repository to your computer.
2. Open Chrome (or Brave/Edge) and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `claude-continue` folder.
6. Pin the extension to your toolbar for easy access to the countdown timer!

## 🛠️ How It Works
1. A lightweight `content.js` script monitors the Claude UI for the *"You are out of free messages until XX:XX"* warning.
2. Once detected, it parses the time, saves it to `chrome.storage`, and sets a background alarm.
3. The popup UI reads this storage to display a sleek live countdown.
4. When the time arrives, it focuses the chat box, simulates a human paste event, and triggers the send button.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

# 🤖 Claude Continue

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-purple.svg)

**Claude Continue** is a modern, Manifest V3 Chrome Extension that solves the frustration of hitting Claude's message limits. Instead of manually checking the clock to see when your limit resets, this extension watches the timer for you. 

When the exact reset time hits, the extension automatically types your resume prompt and hits send.

## ✨ Features

*   **Zero-Sleep Precision:** Uses Chrome's MV3 Alarms API to track the reset time down to the millisecond without getting suspended by the browser.
*   **Tool-Pause Buster:** Automatically detects when Claude pauses for a "tool-use limit". It smartly waits for the main chat UI to un-grey (accounting for React state delays), then automatically clicks "Continue" for you.
*   **Image & Custom Prompt Injection:** Drop images and custom text straight into the extension popup. It handles Base64 conversions, injects them into the chat, and intelligently waits for Claude's servers to process the upload before hitting send.
*   **Smart Typing Simulation:** Injects text via React-compatible `ClipboardEvent` (paste) to reliably wake up ProseMirror and enable the send button.
*   **Gloss Black Dashboard:** A beautiful, ultra-modern dark-mode popup that gives you a live countdown timer with smooth pulsing status indicators and image previews.
*   **Zero Desktop Spam & 5-Minute Fallback:** No annoying OS notifications. When the timer hits, it drops a subtle red badge on the extension icon. If you haven't set a custom prompt, it waits 5 minutes for your confirmation before auto-sending the default message.

## 📝 The Prompt

You can paste any custom text or images directly into the extension's popup dashboard! 

If you leave the dashboard entirely blank, the extension will wait for a 5-minute confirmation window when the limit expires. If you don't intervene, it defaults to automatically typing and sending: 
> *"continue"*

## 🚀 Installation (Developer Mode)

Since this extension is not yet on the Chrome Web Store, you can install it locally in seconds:

1. Download or clone this repository to your computer. 
2. Open Chrome (or Brave/Edge) and navigate to `chrome://extensions/`. 
3. Toggle on **Developer mode** in the top right corner. 
4. Click **Load unpacked** in the top left. 
5. Select the `claude-continue` folder. 
6. Pin the extension to your toolbar for easy access to the countdown timer! 

## 🛠️ How It Works

1. A lightweight `content.js` script monitors the Claude UI for the *"You are out of free messages until XX:XX"* warning (as well as mid-generation tool-use pauses). 
2. Once a time limit is detected, it parses the time, saves your exact project URL to `chrome.storage`, and sets a background alarm. 
3. The popup UI reads this storage to display a sleek live countdown. 
4. When the time arrives, it opens your specific chat tab, scrolls to the bottom, simulates a human paste event (handling both text and Base64 images), waits for Claude's servers to process the uploads, and triggers the send button. 

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

// background.js
console.log("IP Guard Background Service Worker Loaded");

function updateWebRTCBlock(enabled) {
    chrome.privacy.network.webRTCIPHandlingPolicy.set({
        value: enabled ? "disable_non_proxied_udp" : "default"
    }).then(() => {
        console.log("WebRTC Policy Updated:", enabled ? "BLOCKED" : "ENABLED");
    }).catch(err => {
        console.error("WebRTC Block Failed:", err);
    });
}

// Initial load
chrome.storage.local.get(['webrtcBlocked'], (data) => {
    updateWebRTCBlock(data.webrtcBlocked || false);
});

// Listen for changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.webrtcBlocked !== undefined) {
        updateWebRTCBlock(changes.webrtcBlocked.newValue);
    }
});
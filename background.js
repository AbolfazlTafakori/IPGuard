const ALARM_NAME = 'ip-monitor-keepalive';
const CHECK_INTERVAL_MS = 15000; // check every 15 seconds
let checkTimer = null;

async function fetchCurrentIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) return null;
        const { ip } = await res.json();
        return ip || null;
    } catch {
        return null;
    }
}

async function checkIPChange() {
    const data = await chrome.storage.local.get(['monitorEnabled', 'lastKnownIP']);
    if (!data.monitorEnabled) {
        stopMonitor();
        return;
    }

    const currentIP = await fetchCurrentIP();
    if (!currentIP) return;

    const lastIP = data.lastKnownIP;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    await chrome.storage.local.set({ lastKnownIP: currentIP, lastChecked: now });

    if (lastIP && lastIP !== currentIP) {
        chrome.notifications.create('ip-changed-' + Date.now(), {
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: '🚨 IP Guard — IP Changed!',
            message: `Your IP changed!\nOld: ${lastIP}\nNew: ${currentIP}\n\nYour VPN may have disconnected!`,
            priority: 2
        });
    }
}

function startMonitor() {
    // Clear any existing timer
    if (checkTimer) clearInterval(checkTimer);

    // Check immediately
    checkIPChange();

    // Then every 15 seconds
    checkTimer = setInterval(checkIPChange, CHECK_INTERVAL_MS);

    // Keepalive alarm every 1 min to restart service worker if it sleeps
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

function stopMonitor() {
    if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
    }
    chrome.alarms.clear(ALARM_NAME);
}

// Restart timer when service worker wakes up from keepalive alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    const data = await chrome.storage.local.get('monitorEnabled');
    if (data.monitorEnabled && !checkTimer) {
        startMonitor();
    }
});

// Messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'START_MONITOR') {
        startMonitor();
        sendResponse({ ok: true });
    } else if (msg.type === 'STOP_MONITOR') {
        stopMonitor();
        sendResponse({ ok: true });
    } else if (msg.type === 'GET_IP') {
        fetchCurrentIP().then(ip => sendResponse({ ip }));
        return true;
    }
});

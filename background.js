const ALARM_NAME = 'ip-monitor';
const CHECK_URL = 'https://api.ipify.org?format=json';

async function fetchCurrentIP() {
    try {
        const res = await fetch(CHECK_URL);
        if (!res.ok) return null;
        const { ip } = await res.json();
        return ip || null;
    } catch {
        return null;
    }
}

async function checkIPChange() {
    const data = await chrome.storage.local.get(['monitorEnabled', 'lastKnownIP']);
    if (!data.monitorEnabled) return;

    const currentIP = await fetchCurrentIP();
    if (!currentIP) return;

    const lastIP = data.lastKnownIP;

    if (lastIP && lastIP !== currentIP) {
        // IP changed — send notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: '🚨 IP Guard — IP Changed!',
            message: `Your IP changed!\nOld: ${lastIP}\nNew: ${currentIP}\n\nYour VPN may have disconnected.`,
            priority: 2
        });
    }

    await chrome.storage.local.set({ lastKnownIP: currentIP });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) checkIPChange();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'START_MONITOR') {
        const interval = msg.interval || 1;
        chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
        sendResponse({ ok: true });
    } else if (msg.type === 'STOP_MONITOR') {
        chrome.alarms.clear(ALARM_NAME);
        sendResponse({ ok: true });
    } else if (msg.type === 'GET_IP') {
        fetchCurrentIP().then(ip => sendResponse({ ip }));
        return true; // async
    }
});

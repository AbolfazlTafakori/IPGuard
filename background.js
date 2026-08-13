const DEFAULT_SETTINGS = {
    webrtcProtection: true,
    badgeDisplay: true
};

function applyWebRTCPolicy(enabled, callback) {
    const policy = enabled ? 'disable_non_proxied_udp' : 'default';
    if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
        chrome.privacy.network.webRTCIPHandlingPolicy.set(
            { value: policy, scope: 'regular' },
            () => {
                if (chrome.runtime.lastError) {
                    console.warn('WebRTC Policy error:', chrome.runtime.lastError.message);
                }
                if (callback) callback();
            }
        );
    }
}

async function updateBadge() {
    try {
        const { badgeDisplay } = await chrome.storage.local.get('badgeDisplay');
        if (badgeDisplay === false) {
            chrome.action.setBadgeText({ text: '' });
            return;
        }

        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) return;
        const { ip } = await res.json();
        if (!ip) return;

        const geoRes = await fetch(`https://ipwho.is/${ip}`);
        if (!geoRes.ok) return;
        const geo = await geoRes.json();

        if (geo.success && geo.country_code) {
            chrome.action.setBadgeText({ text: geo.country_code });
            chrome.action.setBadgeBackgroundColor({ color: '#22d3ee' });
        }
    } catch (err) {
        // silent fail on network error in background
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['webrtcProtection', 'badgeDisplay'], (stored) => {
        const settings = {
            webrtcProtection: stored.webrtcProtection !== undefined ? stored.webrtcProtection : DEFAULT_SETTINGS.webrtcProtection,
            badgeDisplay: stored.badgeDisplay !== undefined ? stored.badgeDisplay : DEFAULT_SETTINGS.badgeDisplay
        };

        chrome.storage.local.set(settings, () => {
            applyWebRTCPolicy(settings.webrtcProtection);
        });
    });

    chrome.alarms.create('ip_guard_refresh', { periodInMinutes: 10 });
    updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['webrtcProtection'], (stored) => {
        const enabled = stored.webrtcProtection !== undefined ? stored.webrtcProtection : DEFAULT_SETTINGS.webrtcProtection;
        applyWebRTCPolicy(enabled);
    });
    updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'ip_guard_refresh') {
        updateBadge();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SET_WEBRTC_PROTECTION') {
        chrome.storage.local.set({ webrtcProtection: message.value }, () => {
            applyWebRTCPolicy(message.value, () => {
                sendResponse({ success: true });
            });
        });
        return true;
    }

    if (message.action === 'UPDATE_BADGE') {
        updateBadge().then(() => sendResponse({ success: true }));
        return true;
    }
});

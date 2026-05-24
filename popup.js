// popup.js - IP Guard (نسخه نهایی تمیز)
const elements = {
    ip: document.getElementById('ip'),
    country: document.getElementById('country'),
    city: document.getElementById('city'),
    isp: document.getElementById('isp'),
    type: document.getElementById('type'),
    status: document.getElementById('status'),
    webrtcStatus: document.getElementById('webrtc-status'),
    webrtcToggle: document.getElementById('webrtc-toggle'),
    checkBtn: document.getElementById('check-btn')
};

async function checkIP() {
    try {
        elements.status.textContent = "Fetching your IP...";
        elements.status.style.background = "#334155";
        elements.checkBtn.disabled = true;

        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipRes.json();

        elements.ip.textContent = ip;

        const details = await getIPDetails(ip);

        const flag = details.countryCode ? getCountryFlag(details.countryCode) : '🌍';
        elements.country.innerHTML = `${flag} ${details.country || 'Unknown'}`;

        elements.city.textContent = details.city || 'Unknown';
        elements.isp.textContent = details.isp || 'Unknown';
        elements.type.textContent = details.type || 'Residential';

        elements.status.textContent = "✅ Checked Successfully";
        elements.status.style.background = "#22c55e";

    } catch (err) {
        console.error(err);
        elements.status.textContent = "❌ Connection Error";
        elements.status.style.background = "#ef4444";
    } finally {
        elements.checkBtn.disabled = false;
    }
}

async function getIPDetails(ip) {
    const apis = [
        `https://ipapi.co/${ip}/json/`,
        `https://ipinfo.io/${ip}/json`,
        `https://freeipapi.com/api/json/${ip}`
    ];

    for (let url of apis) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();

            return {
                country: data.country_name || data.country || 'Unknown',
                countryCode: data.country_code || data.country || '',
                city: data.city || data.region || 'Unknown',
                isp: data.org || data.isp || 'Unknown',
                type: data.hosting ? "Data Center" : (da                                            1ta.proxy ? "Proxy / VPN" : "Residential")
            };
        } catch (e) {}
    }
    return {};
}

function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

// WebRTC Toggle (فقط UI)
elements.webrtcToggle.addEventListener('change', () => {
    const enabled = elements.webrtcToggle.checked;
    chrome.storage.local.set({ webrtcBlocked: enabled });

    if (enabled) {
        elements.webrtcStatus.innerHTML = "🛡️ WebRTC Blocked<br>Protection Active";
        elements.webrtcStatus.style.color = "#22c55e";
    } else {
        elements.webrtcStatus.innerHTML = "⚠️ WebRTC Enabled<br>Possible Leak Risk";
        elements.webrtcStatus.style.color = "#eab308";
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkIP();

    // Load toggle state
    chrome.storage.local.get('webrtcBlocked', (data) => {
        const enabled = data.webrtcBlocked || false;
        elements.webrtcToggle.checked = enabled;
        if (enabled) {
            elements.webrtcStatus.innerHTML = "🛡️ WebRTC Blocked<br>Protection Active";
            elements.webrtcStatus.style.color = "#22c55e";
        }
    });
});
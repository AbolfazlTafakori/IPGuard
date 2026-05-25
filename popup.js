const elements = {
    ip: document.getElementById('ip'),
    country: document.getElementById('country'),
    city: document.getElementById('city'),
    isp: document.getElementById('isp'),
    type: document.getElementById('type'),
    status: document.getElementById('status'),
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

// Improved detection especially for OVH and hosting
async function getIPDetails(ip) {
    const apis = [
        `https://ipinfo.io/${ip}/json`,
        `https://ipapi.co/${ip}/json/`,
        `https://freeipapi.com/api/json/${ip}`
    ];

    for (let url of apis) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();

            let isp = data.org || data.isp || data.asn?.name || data.connection?.isp || 'Unknown';

            // Special handling for OVH and popular hosting
            if (ip.startsWith('51.178.') || ip.startsWith('51.68.') ||
                ip.startsWith('51.210.') || ip.startsWith('54.36.') ||
                isp.toLowerCase().includes('ovh')) {
                isp = "OVH SAS";
            }

            let type = "Residential";
            if (data.hosting || data.datacenter || isp.toLowerCase().includes('ovh') ||
                isp.toLowerCase().includes('hetzner') || isp.toLowerCase().includes('scaleway')) {
                type = "Data Center";
            } else if (data.proxy || data.vpn) {
                type = "Proxy / VPN";
            }

            return {
                country: data.country_name || data.country || data.countryName || 'Unknown',
                countryCode: data.country_code || data.country || '',
                city: data.city || data.region || data.cityName || 'Unknown',
                isp: isp,
                type: type
            };
        } catch (e) {}
    }

    return { country: 'Unknown', countryCode: '', city: 'Unknown', isp: 'Unknown', type: 'Residential' };
}

function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

// Events
elements.checkBtn.addEventListener('click', checkIP);
document.addEventListener('DOMContentLoaded', checkIP);
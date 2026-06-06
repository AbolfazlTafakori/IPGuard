const elements = {
    ip: document.getElementById('ip'),
    country: document.getElementById('country'),
    city: document.getElementById('city'),
    isp: document.getElementById('isp'),
    type: document.getElementById('type'),
    status: document.getElementById('status'),
    checkBtn: document.getElementById('check-btn')
};

let isChecking = false;

function setStatus(text, state) {
    elements.status.textContent = text;
    elements.status.className = `status status-${state}`;
}

function setTypeBadge(type) {
    let cls = 'badge-residential';
    if (type === 'Data Center') cls = 'badge-datacenter';
    else if (type === 'Proxy / VPN') cls = 'badge-vpn';
    elements.type.innerHTML = `<span class="badge ${cls}">${type}</span>`;
}

async function checkIP() {
    if (isChecking) return;
    isChecking = true;
    elements.checkBtn.disabled = true;
    setStatus('Fetching your IP...', 'loading');

    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (!ipRes.ok) throw new Error(`IP fetch failed: ${ipRes.status}`);
        const { ip } = await ipRes.json();
        if (!ip) throw new Error('No IP in response');

        elements.ip.textContent = ip;

        const details = await getIPDetails(ip);

        const flag = details.countryCode ? getCountryFlag(details.countryCode) : '🌍';
        elements.country.textContent = `${flag} ${details.country || 'Unknown'}`;
        elements.city.textContent = details.city || 'Unknown';
        elements.isp.textContent = details.isp || 'Unknown';
        setTypeBadge(details.type || 'Residential');

        setStatus('✓ Checked Successfully', 'success');

    } catch (err) {
        console.error(err);
        setStatus('✕ Connection Error', 'error');
        elements.ip.textContent = '---';
    } finally {
        isChecking = false;
        elements.checkBtn.disabled = false;
    }
}

async function getIPDetails(ip) {
    // Each entry: [url, parser function]
    const apis = [
        [
            `https://ipapi.co/${ip}/json/`,
            (d) => ({
                country: d.country_name,
                countryCode: d.country_code,
                city: d.city || d.region,
                isp: d.org || d.isp,
                isHosting: d.is_hosting || false,
                isProxy: d.is_proxy || false
            })
        ],
        [
            `https://ipinfo.io/${ip}/json`,
            (d) => ({
                country: d.country ? countryCodeToName(d.country) : null,
                countryCode: d.country,
                city: d.city || d.region,
                isp: d.org,
                isHosting: d.hosting || false,
                isProxy: false
            })
        ],
        [
            `https://freeipapi.com/api/json/${ip}`,
            (d) => ({
                country: d.countryName,
                countryCode: d.countryCode,
                city: d.cityName || d.regionName,
                isp: d.isp || d.asn,
                isHosting: false,
                isProxy: false
            })
        ]
    ];

    for (const [url, parse] of apis) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (data.error || data.reason) continue;

            const parsed = parse(data);
            if (!parsed.countryCode || parsed.countryCode.length !== 2) continue;

            let isp = parsed.isp || 'Unknown';
            if (isp.match(/^AS\d+\s/)) isp = isp.replace(/^AS\d+\s/, '');

            const ispLower = isp.toLowerCase();
            let type = 'Residential';
            if (parsed.isHosting || ispLower.includes('ovh') || ispLower.includes('hetzner') ||
                ispLower.includes('scaleway') || ispLower.includes('amazon') ||
                ispLower.includes('digitalocean') || ispLower.includes('linode') ||
                ispLower.includes('vultr') || ispLower.includes('google cloud') ||
                ispLower.includes('microsoft') || ispLower.includes('cloudflare')) {
                type = 'Data Center';
            } else if (parsed.isProxy) {
                type = 'Proxy / VPN';
            }

            return {
                country: parsed.country || 'Unknown',
                countryCode: parsed.countryCode.toUpperCase(),
                city: parsed.city || 'Unknown',
                isp,
                type
            };
        } catch (e) {
            console.warn(`API failed (${url}):`, e);
        }
    }

    return { country: 'Unknown', countryCode: '', city: 'Unknown', isp: 'Unknown', type: 'Residential' };
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
function countryCodeToName(code) {
    try { return countryNames.of(code); } catch { return code; }
}

function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

elements.checkBtn.addEventListener('click', checkIP);
document.addEventListener('DOMContentLoaded', checkIP);
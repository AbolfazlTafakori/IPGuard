const elements = {
    ip: document.getElementById('ip'),
    ip6: document.getElementById('ip6'),
    copyBtn6: document.getElementById('copy-btn6'),
    country: document.getElementById('country'),
    city: document.getElementById('city'),
    isp: document.getElementById('isp'),
    type: document.getElementById('type'),
    status: document.getElementById('status'),
    checkBtn: document.getElementById('check-btn'),
    copyBtn: document.getElementById('copy-btn'),
    historyList: document.getElementById('history-list'),
    historyEmpty: document.getElementById('history-empty'),
    pageHome: document.getElementById('page-home'),
    pageHistory: document.getElementById('page-history'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    sideMenu: document.getElementById('side-menu'),
    menuOverlay: document.getElementById('menu-overlay'),
    menuHome: document.getElementById('menu-home'),
    menuHistory: document.getElementById('menu-history')
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
        const [ipRes, ip6Res] = await Promise.allSettled([
            fetch('https://api.ipify.org?format=json'),
            fetch('https://api6.ipify.org?format=json')
        ]);

        if (ipRes.status !== 'fulfilled' || !ipRes.value.ok) throw new Error('IP fetch failed');
        const { ip } = await ipRes.value.json();
        if (!ip) throw new Error('No IP in response');

        elements.ip.textContent = ip;

        if (ip6Res.status === 'fulfilled' && ip6Res.value.ok) {
            const { ip: ip6 } = await ip6Res.value.json();
            elements.ip6.textContent = ip6 || 'Not available';
        } else {
            elements.ip6.textContent = 'Not available';
        }

        const details = await getIPDetails(ip);

        const flag = details.countryCode ? getCountryFlag(details.countryCode) : '🌍';
        elements.country.textContent = `${flag} ${details.country || 'Unknown'}`;
        elements.city.textContent = details.city || 'Unknown';
        elements.isp.textContent = details.isp || 'Unknown';
        setTypeBadge(details.type || 'Residential');

        setStatus('✓ Checked Successfully', 'success');
        saveHistory(ip);
        renderHistory();

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

// ── Menu ──
function openMenu() {
    elements.sideMenu.classList.add('open');
    elements.menuOverlay.classList.add('open');
}

function closeMenu() {
    elements.sideMenu.classList.remove('open');
    elements.menuOverlay.classList.remove('open');
}

function navigateTo(page) {
    closeMenu();
    if (page === 'home') {
        elements.pageHome.style.display = 'block';
        elements.pageHistory.style.display = 'none';
        elements.menuHome.classList.add('active');
        elements.menuHistory.classList.remove('active');
    } else {
        elements.pageHome.style.display = 'none';
        elements.pageHistory.style.display = 'block';
        elements.menuHome.classList.remove('active');
        elements.menuHistory.classList.add('active');
        renderHistory();
    }
}

elements.hamburgerBtn.addEventListener('click', openMenu);
elements.menuOverlay.addEventListener('click', closeMenu);
elements.menuHome.addEventListener('click', () => navigateTo('home'));
elements.menuHistory.addEventListener('click', () => navigateTo('history'));

// ── Copy IP ──
function setupCopy(btn, getVal) {
    btn.addEventListener('click', () => {
        const val = getVal();
        if (!val || val === '---' || val === 'Not available') return;
        navigator.clipboard.writeText(val).then(() => {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1500);
        });
    });
}

setupCopy(elements.copyBtn, () => elements.ip.textContent);
setupCopy(elements.copyBtn6, () => elements.ip6.textContent);

// ── History ──
function saveHistory(ip) {
    let history = JSON.parse(localStorage.getItem('ipHistory') || '[]');
    history = history.filter(e => e.ip !== ip);
    history.unshift({ ip, time: Date.now() });
    history = history.slice(0, 5);
    localStorage.setItem('ipHistory', JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('ipHistory') || '[]');
    if (history.length === 0) {
        elements.historyList.innerHTML = '';
        elements.historyEmpty.style.display = 'block';
        return;
    }
    elements.historyEmpty.style.display = 'none';
    elements.historyList.innerHTML = history.map(e => {
        const d = new Date(e.time);
        const time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item"><span class="history-ip">${e.ip}</span><span class="history-time">${time}</span></div>`;
    }).join('');
}

elements.checkBtn.addEventListener('click', checkIP);
document.addEventListener('DOMContentLoaded', () => { checkIP(); });
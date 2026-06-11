const elements = {
    ip: document.getElementById('ip'),
    ip6: document.getElementById('ip6'),
    copyBtn6: document.getElementById('copy-btn6'),
    pageWebrtc: document.getElementById('page-webrtc'),
    menuWebrtc: document.getElementById('menu-webrtc'),
    webrtcBtn: document.getElementById('webrtc-btn'),
    webrtcIcon: document.getElementById('webrtc-icon'),
    webrtcResultText: document.getElementById('webrtc-result-text'),
    webrtcSub: document.getElementById('webrtc-sub'),
    webrtcIps: document.getElementById('webrtc-ips'),
    webrtcVpnIp: document.getElementById('webrtc-vpn-ip'),
    webrtcRealIp: document.getElementById('webrtc-real-ip'),
    webrtcLocalIp: document.getElementById('webrtc-local-ip'),
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

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setStatus(`✓ Live · Last updated ${now}`, 'success');
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
    elements.pageHome.style.display = 'none';
    elements.pageHistory.style.display = 'none';
    elements.pageWebrtc.style.display = 'none';
    elements.menuHome.classList.remove('active');
    elements.menuHistory.classList.remove('active');
    elements.menuWebrtc.classList.remove('active');

    if (page === 'home') {
        elements.pageHome.style.display = 'block';
        elements.menuHome.classList.add('active');
    } else if (page === 'history') {
        elements.pageHistory.style.display = 'block';
        elements.menuHistory.classList.add('active');
        renderHistory();
    } else if (page === 'webrtc') {
        elements.pageWebrtc.style.display = 'block';
        elements.menuWebrtc.classList.add('active');
        loadProtectionState();
    }
}

elements.hamburgerBtn.addEventListener('click', openMenu);
elements.menuOverlay.addEventListener('click', closeMenu);
elements.menuHome.addEventListener('click', () => navigateTo('home'));
elements.menuHistory.addEventListener('click', () => navigateTo('history'));
elements.menuWebrtc.addEventListener('click', () => navigateTo('webrtc'));

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

// ── WebRTC Leak Detection ──
function collectWebRTCIPs() {
    return new Promise((resolve) => {
        const localIPs = new Set();
        const publicIPs = new Set();

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        });

        pc.createDataChannel('leak-test');

        pc.onicecandidate = (e) => {
            if (!e.candidate) {
                pc.close();
                resolve({ localIPs: [...localIPs], publicIPs: [...publicIPs] });
                return;
            }

            const parts = e.candidate.candidate.split(' ');
            const ip = parts[4];
            const type = parts[7];

            if (!ip || ip.endsWith('.local')) return;

            if (type === 'host') {
                localIPs.add(ip);
            } else if (type === 'srflx') {
                publicIPs.add(ip);
                const raddrIndex = parts.indexOf('raddr');
                if (raddrIndex !== -1 && parts[raddrIndex + 1]) {
                    publicIPs.add(parts[raddrIndex + 1]);
                }
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(() => resolve({ localIPs: [], publicIPs: [] }));

        setTimeout(() => {
            pc.close();
            resolve({ localIPs: [...localIPs], publicIPs: [...publicIPs] });
        }, 6000);
    });
}

async function runWebRTCTest() {
    elements.webrtcBtn.disabled = true;
    elements.webrtcIcon.textContent = '🔍';
    elements.webrtcResultText.textContent = 'Testing...';
    elements.webrtcResultText.className = 'webrtc-result-text';
    elements.webrtcSub.textContent = 'Collecting ICE candidates via STUN...';
    elements.webrtcIps.style.display = 'none';

    try {
        const currentIP = elements.ip.textContent;
        const { localIPs, publicIPs } = await collectWebRTCIPs();

        const privateRanges = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|fc|fd|fe80)/i;
        const leakedPublicIPs = publicIPs.filter(ip => !privateRanges.test(ip) && ip !== currentIP);
        const localOnly = localIPs.filter(ip => privateRanges.test(ip));

        elements.webrtcVpnIp.textContent = currentIP !== '---' ? currentIP : 'Unknown';
        elements.webrtcLocalIp.textContent = localOnly.length > 0 ? localOnly.join(', ') : 'None detected';

        if (leakedPublicIPs.length > 0) {
            elements.webrtcIcon.textContent = '🚨';
            elements.webrtcResultText.textContent = 'WebRTC Leak Detected!';
            elements.webrtcResultText.className = 'webrtc-result-text leak';
            elements.webrtcSub.textContent = 'Your real IP is exposed through WebRTC. Your VPN is NOT fully protecting you.';
            elements.webrtcRealIp.textContent = leakedPublicIPs.join(', ');
            elements.webrtcRealIp.style.color = 'var(--danger)';
        } else if (publicIPs.size === 0 && localIPs.size === 0) {
            elements.webrtcIcon.textContent = '🛡️';
            elements.webrtcResultText.textContent = 'WebRTC Disabled or Blocked';
            elements.webrtcResultText.className = 'webrtc-result-text safe';
            elements.webrtcSub.textContent = 'No IP was exposed. WebRTC may be disabled in your browser settings.';
            elements.webrtcRealIp.textContent = 'None';
            elements.webrtcRealIp.style.color = 'var(--success)';
        } else {
            elements.webrtcIcon.textContent = '✅';
            elements.webrtcResultText.textContent = 'No WebRTC Leak';
            elements.webrtcResultText.className = 'webrtc-result-text safe';
            elements.webrtcSub.textContent = 'Your real IP is not exposed through WebRTC. You are protected.';
            elements.webrtcRealIp.textContent = currentIP;
            elements.webrtcRealIp.style.color = 'var(--success)';
        }

        elements.webrtcIps.style.display = 'block';

    } catch (err) {
        console.error(err);
        elements.webrtcIcon.textContent = '❌';
        elements.webrtcResultText.textContent = 'Test Failed';
        elements.webrtcSub.textContent = 'Could not run the WebRTC test. Please try again.';
    } finally {
        elements.webrtcBtn.disabled = false;
    }
}

// ── WebRTC Protection Toggle ──
const toggle = document.getElementById('webrtc-protect-toggle');

function applyWebRTCPolicy(protect) {
    const policy = protect ? 'disable_non_proxied_udp' : 'default';
    chrome.privacy.network.webRTCIPHandlingPolicy.set(
        { value: policy, scope: 'regular' },
        () => { if (chrome.runtime.lastError) console.warn('WebRTC policy error:', chrome.runtime.lastError.message); }
    );
}

function loadProtectionState() {
    chrome.privacy.network.webRTCIPHandlingPolicy.get({}, (details) => {
        toggle.checked = details.value === 'disable_non_proxied_udp';
    });
}

toggle.addEventListener('change', () => { applyWebRTCPolicy(toggle.checked); });
elements.webrtcBtn.addEventListener('click', runWebRTCTest);

// ── Auto Refresh ──
let autoRefreshTimer = null;

function startAutoRefresh() {
    checkIP();
    autoRefreshTimer = setInterval(checkIP, 15000);
}

elements.checkBtn.addEventListener('click', () => {
    clearInterval(autoRefreshTimer);
    startAutoRefresh();
});

document.addEventListener('DOMContentLoaded', startAutoRefresh);

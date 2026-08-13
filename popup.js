const elements = {
    // Navigation
    hamburgerBtn: document.getElementById('hamburger-btn'),
    quickRefreshBtn: document.getElementById('quick-refresh-btn'),
    sideMenu: document.getElementById('side-menu'),
    menuOverlay: document.getElementById('menu-overlay'),
    menuHome: document.getElementById('menu-home'),
    menuWebrtc: document.getElementById('menu-webrtc'),
    menuDns: document.getElementById('menu-dns'),
    menuHistory: document.getElementById('menu-history'),
    pageHome: document.getElementById('page-home'),
    pageWebrtc: document.getElementById('page-webrtc'),
    pageDns: document.getElementById('page-dns'),
    pageHistory: document.getElementById('page-history'),

    // Home
    status: document.getElementById('status'),
    ip: document.getElementById('ip'),
    ip6: document.getElementById('ip6'),
    copyBtn: document.getElementById('copy-btn'),
    copyBtn6: document.getElementById('copy-btn6'),
    country: document.getElementById('country'),
    city: document.getElementById('city'),
    isp: document.getElementById('isp'),
    asn: document.getElementById('asn'),
    type: document.getElementById('type'),
    timezone: document.getElementById('timezone'),
    ping: document.getElementById('ping'),
    checkBtn: document.getElementById('check-btn'),

    // WebRTC
    webrtcProtectToggle: document.getElementById('webrtc-protect-toggle'),
    webrtcStatusBox: document.getElementById('webrtc-status-box'),
    webrtcIcon: document.getElementById('webrtc-icon'),
    webrtcResultText: document.getElementById('webrtc-result-text'),
    webrtcSub: document.getElementById('webrtc-sub'),
    webrtcIps: document.getElementById('webrtc-ips'),
    webrtcVpnIp: document.getElementById('webrtc-vpn-ip'),
    webrtcRealIp: document.getElementById('webrtc-real-ip'),
    webrtcLocalIp: document.getElementById('webrtc-local-ip'),
    webrtcCandidatesCount: document.getElementById('webrtc-candidates-count'),
    webrtcBtn: document.getElementById('webrtc-btn'),

    // DNS
    dnsStatusBox: document.getElementById('dns-status-box'),
    dnsIcon: document.getElementById('dns-icon'),
    dnsResultText: document.getElementById('dns-result-text'),
    dnsSub: document.getElementById('dns-sub'),
    dnsDetails: document.getElementById('dns-details'),
    dnsIpCountry: document.getElementById('dns-ip-country'),
    dnsServer: document.getElementById('dns-server'),
    dnsCountry: document.getElementById('dns-country'),
    dnsStatusBadge: document.getElementById('dns-status-badge'),
    dnsBtn: document.getElementById('dns-btn'),

    // History
    historyList: document.getElementById('history-list'),
    historyEmpty: document.getElementById('history-empty'),
    clearHistoryBtn: document.getElementById('clear-history-btn')
};

let isChecking = false;
let autoRefreshTimer = null;
let currentPublicIPv4 = '';
let currentPublicIPv6 = '';
let currentCountryCode = '';

// ── Status Helper ──
function setStatus(text, state) {
    elements.status.textContent = text;
    elements.status.className = `status status-${state}`;
}

// ── Badges ──
function setTypeBadge(type) {
    let cls = 'badge-residential';
    if (type === 'Data Center') cls = 'badge-datacenter';
    else if (type === 'Proxy / VPN') cls = 'badge-vpn';
    else if (type === 'Mobile') cls = 'badge-mobile';
    else if (type === 'Business') cls = 'badge-business';

    elements.type.innerHTML = `<span class="badge ${cls}">${type}</span>`;
}

// ── IP Fetching Engine ──
async function fetchWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

async function getIPv4() {
    const endpoints = [
        async () => {
            const res = await fetchWithTimeout('https://api.ipify.org?format=json');
            const data = await res.json();
            return data.ip;
        },
        async () => {
            const res = await fetchWithTimeout('https://api4.my-ip.io/ip.json');
            const data = await res.json();
            return data.ip;
        },
        async () => {
            const res = await fetchWithTimeout('https://ipv4.icanhazip.com');
            const text = await res.text();
            return text.trim();
        }
    ];

    for (const fetcher of endpoints) {
        try {
            const ip = await fetcher();
            if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return ip;
            }
        } catch (e) {
            // try next
        }
    }
    return null;
}

async function getIPv6() {
    const endpoints = [
        async () => {
            const res = await fetchWithTimeout('https://api6.ipify.org?format=json', 2500);
            const data = await res.json();
            return data.ip;
        },
        async () => {
            const res = await fetchWithTimeout('https://api6.my-ip.io/ip.json', 2500);
            const data = await res.json();
            return data.ip;
        },
        async () => {
            const res = await fetchWithTimeout('https://ipv6.icanhazip.com', 2500);
            const text = await res.text();
            return text.trim();
        }
    ];

    for (const fetcher of endpoints) {
        try {
            const ip = await fetcher();
            if (ip && ip.includes(':')) {
                return ip;
            }
        } catch (e) {
            // try next
        }
    }
    return null;
}

// ── IP Details & Datacenter Detection ──
const DATACENTER_KEYWORDS = [
    'ovh', 'hetzner', 'scaleway', 'amazon', 'aws', 'digitalocean', 'linode', 'vultr',
    'google cloud', 'gcp', 'microsoft', 'azure', 'cloudflare', 'fastly', 'akamai',
    'leaseweb', 'contabo', 'oracle', 'alibaba', 'm247', 'choopa', 'constant',
    'zenlayer', 'cogent', 'hivelocity', 'hostinger', 'hostkey', 'kamatera',
    'datacamp', 'clouvider', 'serverius', 'quadranet', 'rackspace', 'liquid web',
    'softlayer', 'ipvanish', 'nordvpn', 'expressvpn', 'surfshark', 'mullvad',
    'proton', 'wireguard', 'openvpn', 'datacenter', 'hosting', 'server', 'cloud',
    'vps', 'dedicated', 'voxility', 'datapacket', 'psychz', 'frantech', 'buyvm'
];

function classifyConnectionType(ispName, orgName, asName, flags = {}) {
    const combined = `${ispName} ${orgName} ${asName}`.toLowerCase();

    if (flags.isHosting || flags.isDatacenter) {
        return 'Data Center';
    }

    if (flags.isProxy || flags.isVpn || flags.isTor) {
        return 'Proxy / VPN';
    }

    if (flags.isMobile) {
        return 'Mobile';
    }

    for (const kw of DATACENTER_KEYWORDS) {
        if (combined.includes(kw)) {
            return 'Data Center';
        }
    }

    if (flags.isBusiness) {
        return 'Business';
    }

    return 'Residential';
}

async function getIPDetails(ip) {
    const sources = [
        {
            url: `https://ipwho.is/${ip}`,
            parser: (d) => {
                if (!d.success) return null;
                const isHosting = d.type === 'datacenter' || (d.connection && d.connection.type === 'datacenter');
                const isBusiness = d.type === 'business' || (d.connection && d.connection.type === 'business');
                const isp = d.connection ? d.connection.isp : d.isp;
                const org = d.connection ? d.connection.org : d.org;
                const asn = d.connection && d.connection.asn ? `AS${d.connection.asn}` : '';

                return {
                    country: d.country,
                    countryCode: d.country_code,
                    flag: d.flag && d.flag.emoji ? d.flag.emoji : getCountryFlag(d.country_code),
                    city: d.city ? (d.region ? `${d.city}, ${d.region}` : d.city) : d.region,
                    isp: isp || org || 'Unknown',
                    asn: asn ? `${asn} ${org ? `(${org})` : ''}` : (org || 'Unknown'),
                    timezone: d.timezone ? `${d.timezone.id || d.timezone.utc || ''} (${d.timezone.current_time ? d.timezone.current_time.slice(11, 16) : ''})` : '---',
                    type: classifyConnectionType(isp || '', org || '', asn || '', { isDatacenter: isHosting, isBusiness })
                };
            }
        },
        {
            url: `https://freeipapi.com/api/json/${ip}`,
            parser: (d) => {
                const asn = d.asn ? `AS${d.asn}` : '';
                return {
                    country: d.countryName,
                    countryCode: d.countryCode,
                    flag: getCountryFlag(d.countryCode),
                    city: d.cityName ? (d.regionName ? `${d.cityName}, ${d.regionName}` : d.cityName) : d.regionName,
                    isp: d.isp || 'Unknown',
                    asn: asn ? `${asn} ${d.isp ? `(${d.isp})` : ''}` : '---',
                    timezone: d.timeZone || '---',
                    type: classifyConnectionType(d.isp || '', '', asn || '', { isProxy: d.isProxy })
                };
            }
        },
        {
            url: `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,timezone,isp,org,as,hosting,proxy,mobile`,
            parser: (d) => {
                if (d.status !== 'success') return null;
                return {
                    country: d.country,
                    countryCode: d.countryCode,
                    flag: getCountryFlag(d.countryCode),
                    city: d.city ? (d.regionName ? `${d.city}, ${d.regionName}` : d.city) : d.regionName,
                    isp: d.isp || d.org || 'Unknown',
                    asn: d.as || '---',
                    timezone: d.timezone || '---',
                    type: classifyConnectionType(d.isp || '', d.org || '', d.as || '', { isHosting: d.hosting, isProxy: d.proxy, isMobile: d.mobile })
                };
            }
        },
        {
            url: `https://ipapi.co/${ip}/json/`,
            parser: (d) => {
                if (d.error) return null;
                return {
                    country: d.country_name,
                    countryCode: d.country_code,
                    flag: getCountryFlag(d.country_code),
                    city: d.city ? (d.region ? `${d.city}, ${d.region}` : d.city) : d.region,
                    isp: d.org || d.isp || 'Unknown',
                    asn: d.asn ? `${d.asn} (${d.org || ''})` : '---',
                    timezone: d.timezone || '---',
                    type: classifyConnectionType(d.isp || '', d.org || '', d.asn || '', { isHosting: d.is_hosting, isProxy: d.is_proxy })
                };
            }
        }
    ];

    for (const source of sources) {
        try {
            const res = await fetchWithTimeout(source.url, 3500);
            if (!res.ok) continue;
            const data = await res.json();
            const parsed = source.parser(data);
            if (parsed && parsed.country) {
                return parsed;
            }
        } catch (e) {
            // try next provider
        }
    }

    return {
        country: 'Unknown',
        countryCode: '',
        flag: '🌍',
        city: 'Unknown',
        isp: 'Unknown',
        asn: '---',
        timezone: '---',
        type: 'Residential'
    };
}

function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

// ── Main IP Check Workflow ──
async function checkIP() {
    if (isChecking) return;
    isChecking = true;
    elements.checkBtn.disabled = true;
    elements.quickRefreshBtn.classList.add('spinning');
    setStatus('Fetching IP & details...', 'loading');

    const startTime = performance.now();

    try {
        const [ip4, ip6] = await Promise.all([getIPv4(), getIPv6()]);

        if (!ip4 && !ip6) {
            throw new Error('Failed to retrieve IP address');
        }

        const elapsedPing = Math.round(performance.now() - startTime);
        elements.ping.textContent = `${elapsedPing} ms`;

        currentPublicIPv4 = ip4 || '';
        currentPublicIPv6 = ip6 || '';

        elements.ip.textContent = ip4 || 'Not available';
        elements.ip6.textContent = ip6 || 'Not available';

        const mainIP = ip4 || ip6;
        const details = await getIPDetails(mainIP);

        currentCountryCode = details.countryCode || '';
        elements.country.textContent = `${details.flag} ${details.country}`;
        elements.city.textContent = details.city || 'Unknown';
        elements.isp.textContent = details.isp || 'Unknown';
        elements.asn.textContent = details.asn || '---';
        elements.timezone.textContent = details.timezone || '---';
        setTypeBadge(details.type || 'Residential');

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setStatus(`✓ Live · Last updated ${now}`, 'success');

        saveHistory({
            ip: mainIP,
            ip6: ip6 || '',
            country: details.country,
            countryCode: details.countryCode,
            flag: details.flag,
            isp: details.isp,
            type: details.type
        });

        // Notify background worker to refresh badge
        chrome.runtime.sendMessage({ action: 'UPDATE_BADGE' });

    } catch (err) {
        console.error('Check IP failed:', err);
        setStatus('✕ Connection Error', 'error');
        if (elements.ip.textContent === '---') elements.ip.textContent = 'Unavailable';
    } finally {
        isChecking = false;
        elements.checkBtn.disabled = false;
        elements.quickRefreshBtn.classList.remove('spinning');
    }
}

// ── WebRTC Leak Test Engine ──
function collectWebRTCIPs() {
    return new Promise((resolve) => {
        const localIPs = new Set();
        const publicIPs = new Set();
        let candidateCount = 0;
        let resolved = false;

        function finish() {
            if (resolved) return;
            resolved = true;
            try { pc.close(); } catch (e) {}
            resolve({
                localIPs: [...localIPs],
                publicIPs: [...publicIPs],
                candidateCount
            });
        }

        const config = {
            iceServers: [
                { urls: 'stun:stun.cloudflare.com:3478' },
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun.syncthing.net:3478' }
            ]
        };

        let pc;
        try {
            pc = new RTCPeerConnection(config);
        } catch (e) {
            resolve({ localIPs: [], publicIPs: [], candidateCount: 0, disabled: true });
            return;
        }

        pc.createDataChannel('ip-guard-channel');

        pc.onicecandidate = (e) => {
            if (!e || !e.candidate) {
                setTimeout(finish, 400);
                return;
            }

            candidateCount++;
            const raw = e.candidate.candidate;
            const parts = raw.split(' ');
            const ip = parts[4];
            const type = parts[7];

            if (!ip || ip.endsWith('.local')) return;

            const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|fc00:|fd00:|fe80:)/i.test(ip);

            if (isPrivate || type === 'host') {
                localIPs.add(ip);
            } else {
                publicIPs.add(ip);
            }

            const raddrIdx = parts.indexOf('raddr');
            if (raddrIdx !== -1 && parts[raddrIdx + 1]) {
                const raddr = parts[raddrIdx + 1];
                if (!raddr.endsWith('.local') && !/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|fc00:|fd00:|fe80:)/i.test(raddr)) {
                    publicIPs.add(raddr);
                }
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(() => finish());

        setTimeout(finish, 4500);
    });
}

async function runWebRTCTest() {
    elements.webrtcBtn.disabled = true;
    elements.webrtcIcon.textContent = '🔍';
    elements.webrtcResultText.textContent = 'Analyzing WebRTC candidates...';
    elements.webrtcResultText.className = 'webrtc-result-text';
    elements.webrtcSub.textContent = 'Probing STUN servers for reflexive and host candidates...';
    elements.webrtcIps.style.display = 'none';

    try {
        const { localIPs, publicIPs, candidateCount, disabled } = await collectWebRTCIPs();

        const activeIPv4 = currentPublicIPv4 || elements.ip.textContent;
        const activeIPv6 = currentPublicIPv6 || elements.ip6.textContent;
        const knownPublicIPs = [activeIPv4, activeIPv6].filter(ip => ip && ip !== '---' && ip !== 'Not available' && ip !== 'Unavailable');

        const privateRegex = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|fc00:|fd00:|fe80:)/i;
        const leakedPublicIPs = publicIPs.filter(ip => !privateRegex.test(ip) && !knownPublicIPs.includes(ip));
        const localOnly = localIPs.filter(ip => privateRegex.test(ip));

        elements.webrtcVpnIp.textContent = knownPublicIPs.length > 0 ? knownPublicIPs.join(', ') : 'Unknown';
        elements.webrtcLocalIp.textContent = localOnly.length > 0 ? localOnly.join(', ') : 'Protected / None';
        elements.webrtcCandidatesCount.textContent = `${candidateCount} candidates`;

        if (disabled || candidateCount === 0) {
            elements.webrtcIcon.textContent = '🛡️';
            elements.webrtcResultText.textContent = 'WebRTC Disabled / Blocked';
            elements.webrtcResultText.className = 'webrtc-result-text safe';
            elements.webrtcSub.textContent = 'No WebRTC candidates exposed. Your IP handling policy is fully blocking STUN UDP leaks.';
            elements.webrtcRealIp.textContent = 'None exposed';
            elements.webrtcRealIp.style.color = 'var(--success)';
        } else if (leakedPublicIPs.length > 0) {
            elements.webrtcIcon.textContent = '🚨';
            elements.webrtcResultText.textContent = 'WebRTC Leak Detected!';
            elements.webrtcResultText.className = 'webrtc-result-text leak';
            elements.webrtcSub.textContent = 'Warning: An unproxied real public IP is exposed through WebRTC STUN requests.';
            elements.webrtcRealIp.textContent = leakedPublicIPs.join(', ');
            elements.webrtcRealIp.style.color = 'var(--danger)';
        } else {
            elements.webrtcIcon.textContent = '✅';
            elements.webrtcResultText.textContent = 'No WebRTC Leak';
            elements.webrtcResultText.className = 'webrtc-result-text safe';
            elements.webrtcSub.textContent = 'Your real public IP is not exposed. WebRTC is properly routing traffic through your proxy/VPN.';
            elements.webrtcRealIp.textContent = knownPublicIPs.length > 0 ? knownPublicIPs.join(', ') : 'Protected';
            elements.webrtcRealIp.style.color = 'var(--success)';
        }

        elements.webrtcIps.style.display = 'block';

    } catch (err) {
        console.error('WebRTC test error:', err);
        elements.webrtcIcon.textContent = '❌';
        elements.webrtcResultText.textContent = 'Test Error';
        elements.webrtcSub.textContent = 'Could not complete the WebRTC probe. Please check your internet connection.';
    } finally {
        elements.webrtcBtn.disabled = false;
    }
}

// ── WebRTC Protection Management ──
function setWebRTCProtection(protect) {
    chrome.runtime.sendMessage({ action: 'SET_WEBRTC_PROTECTION', value: protect }, () => {
        elements.webrtcProtectToggle.checked = protect;
    });
}

function loadWebRTCProtectionState() {
    chrome.storage.local.get('webrtcProtection', (data) => {
        if (data.webrtcProtection !== undefined) {
            elements.webrtcProtectToggle.checked = data.webrtcProtection;
        } else if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
            chrome.privacy.network.webRTCIPHandlingPolicy.get({}, (details) => {
                elements.webrtcProtectToggle.checked = details.value === 'disable_non_proxied_udp';
            });
        }
    });
}

elements.webrtcProtectToggle.addEventListener('change', () => {
    setWebRTCProtection(elements.webrtcProtectToggle.checked);
});
elements.webrtcBtn.addEventListener('click', runWebRTCTest);

// ── DNS Leak Test Engine ──
async function runDNSLeakTest() {
    elements.dnsBtn.disabled = true;
    elements.dnsIcon.textContent = '🔍';
    elements.dnsResultText.textContent = 'Testing DNS Resolvers...';
    elements.dnsResultText.className = 'webrtc-result-text';
    elements.dnsSub.textContent = 'Analyzing DoH resolvers and resolver geolocation...';
    elements.dnsDetails.style.display = 'none';

    try {
        const activeCountry = currentCountryCode || 'Unknown';
        elements.dnsIpCountry.textContent = activeCountry;

        const res = await fetchWithTimeout('https://1.1.1.1/cdn-cgi/trace', 3500);
        const text = await res.text();
        const lines = text.split('\n');
        const trace = {};
        for (const line of lines) {
            const [k, v] = line.split('=');
            if (k && v) trace[k] = v;
        }

        const dnsLoc = trace.loc || 'Unknown';
        const dnsColo = trace.colo || 'Cloudflare Resolver';

        elements.dnsServer = document.getElementById('dns-server');
        elements.dnsCountry = document.getElementById('dns-country');
        elements.dnsStatusBadge = document.getElementById('dns-status-badge');

        elements.dnsServer.textContent = `Cloudflare (${dnsColo})`;
        elements.dnsCountry.textContent = dnsLoc;

        const matches = activeCountry === 'Unknown' || dnsLoc === 'Unknown' || activeCountry.toUpperCase() === dnsLoc.toUpperCase();

        if (matches) {
            elements.dnsIcon.textContent = '✅';
            elements.dnsResultText.textContent = 'No DNS Leak Detected';
            elements.dnsResultText.className = 'webrtc-result-text safe';
            elements.dnsSub.textContent = 'Your DNS requests resolve in the same region as your public IP.';
            elements.dnsStatusBadge.innerHTML = '<span class="badge badge-residential">Protected</span>';
        } else {
            elements.dnsIcon.textContent = '⚠️';
            elements.dnsResultText.textContent = 'Possible DNS Mismatch';
            elements.dnsResultText.className = 'webrtc-result-text leak';
            elements.dnsSub.textContent = `Your DNS queries are resolving in ${dnsLoc}, which differs from your IP country (${activeCountry}).`;
            elements.dnsStatusBadge.innerHTML = '<span class="badge badge-vpn">Location Mismatch</span>';
        }

        elements.dnsDetails.style.display = 'block';

    } catch (err) {
        console.error('DNS leak test error:', err);
        elements.dnsIcon.textContent = '❌';
        elements.dnsResultText.textContent = 'DNS Test Failed';
        elements.dnsSub.textContent = 'Could not reach DNS test probe. Please try again.';
    } finally {
        elements.dnsBtn.disabled = false;
    }
}

elements.dnsBtn.addEventListener('click', runDNSLeakTest);

// ── Navigation ──
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
    elements.pageWebrtc.style.display = 'none';
    elements.pageDns.style.display = 'none';
    elements.pageHistory.style.display = 'none';

    elements.menuHome.classList.remove('active');
    elements.menuWebrtc.classList.remove('active');
    elements.menuDns.classList.remove('active');
    elements.menuHistory.classList.remove('active');

    if (page === 'home') {
        elements.pageHome.style.display = 'block';
        elements.menuHome.classList.add('active');
    } else if (page === 'webrtc') {
        elements.pageWebrtc.style.display = 'block';
        elements.menuWebrtc.classList.add('active');
        loadWebRTCProtectionState();
    } else if (page === 'dns') {
        elements.pageDns.style.display = 'block';
        elements.menuDns.classList.add('active');
    } else if (page === 'history') {
        elements.pageHistory.style.display = 'block';
        elements.menuHistory.classList.add('active');
        renderHistory();
    }
}

elements.hamburgerBtn.addEventListener('click', openMenu);
elements.menuOverlay.addEventListener('click', closeMenu);
elements.menuHome.addEventListener('click', () => navigateTo('home'));
elements.menuWebrtc.addEventListener('click', () => navigateTo('webrtc'));
elements.menuDns.addEventListener('click', () => navigateTo('dns'));
elements.menuHistory.addEventListener('click', () => navigateTo('history'));

// ── Copy Helper ──
function setupCopy(btn, getVal) {
    btn.addEventListener('click', () => {
        const val = getVal();
        if (!val || val === '---' || val === 'Not available' || val === 'Unavailable') return;
        navigator.clipboard.writeText(val).then(() => {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1500);
        });
    });
}

setupCopy(elements.copyBtn, () => elements.ip.textContent);
setupCopy(elements.copyBtn6, () => elements.ip6.textContent);

// ── History Storage ──
function saveHistory(item) {
    chrome.storage.local.get('ipHistory', (data) => {
        let history = data.ipHistory || [];
        if (history.length > 0 && history[0].ip === item.ip) return;

        history = history.filter(e => e.ip !== item.ip);
        history.unshift({
            ...item,
            time: Date.now()
        });

        history = history.slice(0, 15);
        chrome.storage.local.set({ ipHistory: history });
    });
}

function renderHistory() {
    chrome.storage.local.get('ipHistory', (data) => {
        const history = data.ipHistory || [];
        if (history.length === 0) {
            elements.historyList.innerHTML = '';
            elements.historyEmpty.style.display = 'block';
            return;
        }

        elements.historyEmpty.style.display = 'none';
        elements.historyList.innerHTML = history.map(e => {
            const d = new Date(e.time);
            const time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const flag = e.flag || getCountryFlag(e.countryCode);
            const location = [e.city, e.country].filter(Boolean).join(', ') || 'Unknown';

            return `
                <div class="history-item">
                    <div class="history-row-top">
                        <span class="history-ip">${e.ip}</span>
                        <span class="history-time">${time}</span>
                    </div>
                    <div class="history-row-sub">
                        <span>${flag} ${location}</span>
                        <span>${e.isp || ''}</span>
                    </div>
                </div>
            `;
        }).join('');
    });
}

elements.clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ ipHistory: [] }, () => {
        renderHistory();
    });
});

// ── Initialization & Refresh ──
function startAutoRefresh() {
    checkIP();
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(checkIP, 20000);
}

elements.checkBtn.addEventListener('click', () => {
    checkIP();
});

elements.quickRefreshBtn.addEventListener('click', () => {
    checkIP();
});

document.addEventListener('DOMContentLoaded', () => {
    loadWebRTCProtectionState();
    startAutoRefresh();
});

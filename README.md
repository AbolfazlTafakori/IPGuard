# 🛡️ IP Guard

**Advanced IP Checker, Datacenter Detection & Privacy Protection Tool for Chrome**

![Version](https://img.shields.io/badge/Version-2.1-blue)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

A clean, fast, and privacy-focused extension to check your real IP address, detect your location, ISP, and ASN, classify your connection type, and prevent WebRTC & DNS leaks.

---

## ✨ Features

- 🌐 **Dual-Stack Public IP** detection (IPv4 & IPv6 with fast fallbacks)
- 📍 Accurate **Country, City, ISP, ASN, and Timezone** information
- 🔍 **Advanced Connection Classifier** — Residential / Data Center / Proxy & VPN / Mobile / Business
- 🛡️ **WebRTC Leak Detection** — multi-STUN candidate analysis to detect real public & local IP leaks
- 🔒 **Persistent WebRTC Protection** — enforces strict IP handling policies across browser sessions
- 🌐 **DNS Leak Detection** — checks for resolver location mismatches that bypass your VPN
- ⚡ **Ping & Latency** measurement
- 🏷️ **Background Country Badge** on extension icon
- 📋 **One-Click Copy** for IPv4 and IPv6
- 🕐 **IP History** with clear and export capabilities
- 🌙 Modern **Dark Mode UI**
- ⚡ Fast, lightweight, and zero bloat
- 🔒 **Privacy-first** — no tracking or analytics

---

## 📸 Screenshots

<img width="1280" height="800" alt="IP Guard Banner" src="https://github.com/user-attachments/assets/79611e3c-4332-46be-8864-02dcccbfa7e3" />

---

## 📥 Installation

### Chrome Web Store
[![Available in the Chrome Web Store](https://img.shields.io/badge/Available%20in%20Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/ibcekndipggbdinpiojbbddboekhaaei?utm_source=item-share-cb)

### Manual Installation
1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder

---

## 🔒 Privacy & Security

- No user data is collected or tracked
- Uses public, privacy-friendly endpoints
- WebRTC policy strictly managed via Chrome's native privacy API
- Fully open source

---

## 🛠️ Tech Stack

- Manifest V3 (Service Worker)
- Vanilla JavaScript (Modern ES6+)
- Native Chrome Privacy API (`webRTCIPHandlingPolicy`)
- WebRTC RTCPeerConnection & STUN Protocol
- Pure CSS3 Dark Design System

---

## 🗺️ Roadmap

- [x] Dual-stack IPv4 & IPv6 detection
- [x] Multi-STUN WebRTC leak detection & isolation
- [x] Persistent WebRTC Protection (`disable_non_proxied_udp`)
- [x] Advanced Datacenter & ASN Classifier
- [x] DNS Leak Detection
- [x] Ping & Latency measurement
- [x] Background country badge
- [x] IP History log with clear option
- [ ] VPN Disconnect Desktop Notification
- [ ] WHOIS Lookup
- [ ] Geolocation Map View
- [ ] Multi-language support

---

## 👤 Developer

**Abolfazl Tafakori**  
GitHub: [@AbolfazlTafakori](https://github.com/AbolfazlTafakori)

---

⭐ If you like this extension, please give it a star and leave a review on the Chrome Web Store!


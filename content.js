// content.js - Ultimate WebRTC Killer
(function() {
    'use strict';

    const killWebRTC = () => {
        try {
            // 1. Complete deletion
            delete window.RTCPeerConnection;
            delete window.webkitRTCPeerConnection;
            delete window.mozRTCPeerConnection;

            // 2. Force undefined
            Object.defineProperty(window, 'RTCPeerConnection', {
                value: undefined,
                writable: false,
                configurable: false
            });

            Object.defineProperty(window, 'webkitRTCPeerConnection', {
                value: undefined,
                writable: false,
                configurable: false
            });

            // 3. Block getUserMedia
            if (navigator.mediaDevices) {
                Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                    value: () => Promise.reject(new Error('WebRTC blocked by IP Guard')),
                    writable: false,
                    configurable: false
                });
            }

            console.log('%c🛡️ IP Guard: WebRTC Completely Killed', 'color:#22c55e;font-weight:bold;font-size:13px');
        } catch (e) {
            console.log('WebRTC Kill Error:', e);
        }
    };

    // Run aggressively at different times
    killWebRTC();
    setTimeout(killWebRTC, 10);
    setTimeout(killWebRTC, 100);
    setTimeout(killWebRTC, 400);
    setTimeout(killWebRTC, 1000);
    setTimeout(killWebRTC, 2000);

    // Persistent observer
    new MutationObserver(killWebRTC).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Extra protection layers
    window.addEventListener('load', killWebRTC);
    document.addEventListener('DOMContentLoaded', killWebRTC);
})();
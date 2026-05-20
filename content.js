// content.js - WebRTC Blocker
function blockWebRTC() {
    const script = document.createElement('script');
    script.textContent = `
    Object.defineProperty(window, 'RTCPeerConnection', {
      value: function() { return null; }
    });
    Object.defineProperty(window, 'webkitRTCPeerConnection', {
      value: function() { return null; }
    });
    Object.defineProperty(window, 'mozRTCPeerConnection', {
      value: function() { return null; }
    });
  `;
    document.documentElement.appendChild(script);
    script.remove();
}

// Apply immediately
blockWebRTC();

// Re-apply if needed
const observer = new MutationObserver(blockWebRTC);
observer.observe(document.documentElement, { childList: true, subtree: true });
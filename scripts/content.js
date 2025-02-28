console.log('Content script loaded');

// Inject provider script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('scripts/injected-script.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'FROM_PAGE') return;

    console.log('Content script received message:', event.data);

    // ✅ Check if method exists
    if (!event.data.method) {
        console.error("🚨 ERROR: Received message without 'method'", event.data);
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            method: event.data.method,
            params: event.data.params || []
        });

        window.postMessage({
            type: 'FROM_CONTENT',
            method: event.data.method,
            result: response
        }, '*');
    } catch (error) {
        console.error('Error in content script:', error);
        window.postMessage({
            type: 'FROM_CONTENT',
            method: event.data.method,
            error: error.message
        }, '*');
    }
});
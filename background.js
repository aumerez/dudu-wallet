chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received request:", message);

    if (!message.method) {
        console.error("Error: Received message without method", message);
        sendResponse({ error: "Invalid message: Method is missing" });
        return;
    }

    const handleRequest = async () => {
        try {
            let result;

            switch (message.method) {
                case 'transactionComplete':  // ✅ Handle transaction completion
                    console.log("Transaction successfully completed!", message.params[0]);
                    result = { status: "Transaction finalized" };
                    break;

                case 'eth_requestAccounts':
                    const { wallets } = await chrome.storage.local.get('wallets');
                    if (!wallets || wallets.length === 0) {
                        throw new Error('No accounts found');
                    }
                    result = [wallets[0].address];
                    break;

                case 'eth_sendTransaction':
                    if (!message.params || !message.params[0]) {
                        throw new Error('Missing transaction parameters');
                    }

                    await chrome.storage.local.set({
                        pendingTransaction: message.params[0]
                    });

                    await chrome.action.setPopup({ popup: 'views/sign-transaction.html' });
                    chrome.action.openPopup();

                    result = { status: 'Popup opened' };
                    break;

                default:
                    throw new Error(`Method ${message.method} not supported`);
            }

            sendResponse(result);
        } catch (error) {
            console.error('Error in background:', error);
            sendResponse({ error: error.message });
        }
    };

    handleRequest();
    return true;
});
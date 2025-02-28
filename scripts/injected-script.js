// injected-script.js
(() => {
    window.ethereum = {
        isWalletByPipe: true,
        request: async ({ method, params }) => {
            return new Promise((resolve, reject) => {
                window.postMessage({ 
                    type: 'FROM_PAGE',
                    method, 
                    params,
                }, '*');

                function handleResponse(event) {
                    if (event.data.type === 'FROM_CONTENT' && 
                        event.data.method === method) {
                        window.removeEventListener('message', handleResponse);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            resolve(event.data.result);
                        }
                    }
                }

                window.addEventListener('message', handleResponse);
            });
        }
    };

    console.log('Ethereum provider injected');
    window.dispatchEvent(new Event('ethereum#initialized'));
})();
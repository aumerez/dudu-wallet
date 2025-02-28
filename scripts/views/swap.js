// swap.js - Module pattern implementation
window.SwapModule = (function() {
    // Private variables
    const EXCHANGE_RATE = 0.00001; // 1 IP = 0.00001 IP

    // Demo token list
    const tokens = [
        { 
            symbol: 'IP', 
            name: 'Infinium Protocol', 
            logo: 'https://via.placeholder.com/40',
            balance: 1000.00
        },
        { 
            symbol: 'ETH', 
            name: 'Ethereum', 
            logo: 'https://via.placeholder.com/40',
            balance: 0.05
        },
        { 
            symbol: 'BTC', 
            name: 'Bitcoin', 
            logo: 'https://via.placeholder.com/40',
            balance: 0.001
        },
        { 
            symbol: 'USDT', 
            name: 'Tether', 
            logo: 'https://via.placeholder.com/40',
            balance: 150.00
        },
        { 
            symbol: 'DOGE', 
            name: 'Dogecoin', 
            logo: 'https://via.placeholder.com/40',
            balance: 500.00
        }
    ];

    // Private state variables
    let fromToken = tokens[0]; // Default from token (IP)
    let toToken = tokens[1]; // Default to token (ETH)
    let fromAmount = 0;
    let toAmount = 0;
    let currentSelector = null; // Which token selector was clicked

    // Private DOM element references
    let fromAmountInput, toAmountInput, fromTokenSelector, toTokenSelector;
    let fromBalanceEl, toBalanceEl, swapRateEl, swapButton;
    let tokenSelectModal, tokenList, tokenSearch;

    // Private methods
    function initSwapInterface() {
        console.log("Attempting to initialize swap interface...");
        
        // Use a polling approach to wait for elements
        function waitForSwapElements() {
            // Check for the key elements
            const elementsToCheck = [
                'fromAmount', 'toAmount', 'fromTokenSelector', 'toTokenSelector',
                'fromBalance', 'toBalance', 'swapRate', 'swapButton'
            ];
            
            for (const id of elementsToCheck) {
                if (!document.getElementById(id)) {
                    console.log(`Element not found: ${id}`);
                    return false;
                }
            }
            
            return true;
        }
        
        // If elements aren't ready, don't proceed
        if (!waitForSwapElements()) {
            console.log("Essential swap interface elements not found");
            return false;
        }
        
        // Now we know elements exist, get references
        fromAmountInput = document.getElementById('fromAmount');
        toAmountInput = document.getElementById('toAmount');
        fromTokenSelector = document.getElementById('fromTokenSelector');
        toTokenSelector = document.getElementById('toTokenSelector');
        fromBalanceEl = document.getElementById('fromBalance');
        toBalanceEl = document.getElementById('toBalance');
        swapRateEl = document.getElementById('swapRate');
        swapButton = document.getElementById('swapButton');
        
        // These might be null, so check before using
        tokenSelectModal = document.getElementById('tokenSelectModal');
        tokenList = tokenSelectModal ? document.getElementById('tokenList') : null;
        tokenSearch = tokenSelectModal ? document.getElementById('tokenSearch') : null;
        
        // Set initial token information
        updateTokenDisplay();
        updateSwapRate();
        
        // Add event listeners - only to elements we confirmed exist
        fromAmountInput.addEventListener('input', handleFromAmountChange);
        fromTokenSelector.addEventListener('click', () => openTokenSelect('from'));
        toTokenSelector.addEventListener('click', () => openTokenSelect('to'));
        
        const swapDirectionBtn = document.getElementById('swapDirectionBtn');
        if (swapDirectionBtn) {
            swapDirectionBtn.addEventListener('click', swapTokens);
        }
        
        // Optional elements - only add listeners if they exist
        if (tokenSelectModal) {
            const closeModalBtn = document.getElementById('closeModalBtn');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', closeTokenSelect);
            }
            
            if (tokenSearch) {
                tokenSearch.addEventListener('input', filterTokens);
            }
        }
        
        if (swapButton) {
            swapButton.addEventListener('click', handleSwap);
        }
        
        console.log("Swap interface initialized successfully");
        return true;
    }

    function updateTokenDisplay() {
        // Update "From" token display
        fromBalanceEl.textContent = fromToken.balance.toFixed(2);
        fromTokenSelector.querySelector('.token-symbol').textContent = fromToken.symbol;
        
        // Update "To" token display
        toBalanceEl.textContent = toToken.balance.toFixed(2);
        toTokenSelector.querySelector('.token-symbol').textContent = toToken.symbol;
        
        // Update button state
        validateSwapButton();
    }

    function updateSwapRate() {
        swapRateEl.textContent = `1 ${fromToken.symbol} = ${EXCHANGE_RATE} ${toToken.symbol}`;
    }

    function handleFromAmountChange() {
        fromAmount = parseFloat(fromAmountInput.value) || 0;
        
        // Calculate "To" amount based on exchange rate
        toAmount = fromAmount * EXCHANGE_RATE;
        toAmountInput.value = toAmount > 0 ? toAmount.toFixed(6) : '';
        
        // Update swap button state
        validateSwapButton();
    }

    function validateSwapButton() {
        if (fromAmount <= 0) {
            swapButton.disabled = true;
            swapButton.textContent = 'Enter an amount';
            return;
        }
        
        if (fromAmount > fromToken.balance) {
            swapButton.disabled = true;
            swapButton.textContent = 'Insufficient balance';
            return;
        }
        
        swapButton.disabled = false;
        swapButton.textContent = 'Swap';
    }

    function swapTokens() {
        // Swap token objects
        const temp = fromToken;
        fromToken = toToken;
        toToken = temp;
        
        // Update display
        updateTokenDisplay();
        updateSwapRate();
        
        // Reset amounts
        fromAmountInput.value = '';
        toAmountInput.value = '';
        fromAmount = 0;
        toAmount = 0;
        
        // Update button state
        validateSwapButton();
    }

    function openTokenSelect(selectorType) {
        currentSelector = selectorType;
        tokenSelectModal.style.display = 'flex';
        
        // Clear search
        tokenSearch.value = '';
        
        // Populate token list
        populateTokenList();
        
        // Focus the search input
        setTimeout(() => tokenSearch.focus(), 100);
    }

    function closeTokenSelect() {
        tokenSelectModal.style.display = 'none';
        currentSelector = null;
    }

    function populateTokenList() {
        tokenList.innerHTML = '';
        
        tokens.forEach(token => {
            // Skip the token that's already selected in the other selector
            if ((currentSelector === 'from' && token.symbol === toToken.symbol) ||
                (currentSelector === 'to' && token.symbol === fromToken.symbol)) {
                return;
            }
            
            const tokenItem = document.createElement('div');
            tokenItem.className = 'token-item';
            tokenItem.innerHTML = `
                <div class="token-item-logo" style="background-image: url(${token.logo})"></div>
                <div class="token-item-info">
                    <div class="token-item-symbol">${token.symbol}</div>
                    <div class="token-item-name">${token.name}</div>
                </div>
                <div class="token-item-balance">${token.balance.toFixed(2)}</div>
            `;
            
            tokenItem.addEventListener('click', () => selectToken(token));
            tokenList.appendChild(tokenItem);
        });
    }

    function filterTokens() {
        const searchText = tokenSearch.value.toLowerCase();
        
        const tokenItems = tokenList.querySelectorAll('.token-item');
        tokenItems.forEach(item => {
            const symbol = item.querySelector('.token-item-symbol').textContent.toLowerCase();
            const name = item.querySelector('.token-item-name').textContent.toLowerCase();
            
            if (symbol.includes(searchText) || name.includes(searchText)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function selectToken(token) {
        if (currentSelector === 'from') {
            fromToken = token;
        } else if (currentSelector === 'to') {
            toToken = token;
        }
        
        // Update UI
        updateTokenDisplay();
        updateSwapRate();
        
        // Reset amounts if token changed
        fromAmountInput.value = '';
        toAmountInput.value = '';
        fromAmount = 0;
        toAmount = 0;
        
        // Close the modal
        closeTokenSelect();
    }

    function handleSwap() {
        // In a real app, this would call a contract method to execute the swap
        alert(`Swapping ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`);
        
        // For demo purposes, update balances
        fromToken.balance -= fromAmount;
        toToken.balance += toAmount;
        
        // Update UI
        updateTokenDisplay();
        
        // Reset inputs
        fromAmountInput.value = '';
        toAmountInput.value = '';
        fromAmount = 0;
        toAmount = 0;
        
        // Update button state
        validateSwapButton();
    }

    async function fetchWalletInfo() {
        try {
            // In a real extension, you would get this from chrome.storage or from the parent
            // For this demo, we're using the demo data
            return { success: true };
        } catch (error) {
            console.error('Error fetching wallet info:', error);
            return { success: false, error };
        }
    }

    // Public methods - the API exposed to the outside
    return {
        initialize: async function() {
            console.log('Initializing SwapModule');
            const walletInfo = await fetchWalletInfo();
            if (!walletInfo.success) {
                console.error('Could not load wallet information');
                return false;
            }
            
            // Add retry logic with a maximum number of attempts
            let initialized = false;
            let attempts = 0;
            const maxAttempts = 5;
            
            const tryInitialize = () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const result = initSwapInterface();
                        resolve(result);
                    }, 200); // Wait 200ms between attempts
                });
            };
            
            while (!initialized && attempts < maxAttempts) {
                attempts++;
                console.log(`Attempt ${attempts} to initialize SwapModule`);
                initialized = await tryInitialize();
            }
            
            if (!initialized) {
                console.error(`Failed to initialize SwapModule after ${maxAttempts} attempts`);
            }
            
            return initialized;
        },
        // You can expose other methods if needed
        refreshBalances: function() {
            updateTokenDisplay();
        }
    };
})();

// Set initSwap as the initialization function
window.initSwap = function() {
    window.SwapModule.initialize();
};
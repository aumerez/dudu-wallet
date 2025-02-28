// swap.js - Module pattern implementation with fixes for modal issues
window.SwapModule = (function() {
    // Private variables
    const EXCHANGE_RATE = 0.00001; // 1 IP = 0.00001 IP

    // Demo token list - using your actual tokens
    const tokens = [
        { 
            symbol: 'PIPE', 
            name: 'PIPE Token', 
            logo: 'https://via.placeholder.com/40',
            balance: 1000.00,
            address: '0x1514000000000000000000000000000000000000'
        },
        { 
            symbol: 'IP', 
            name: 'Infinium Protocol', 
            logo: 'https://via.placeholder.com/40',
            balance: 500.00,
            address: '0x1514000000000000000000000000000000000000'
        },
        { 
            symbol: 'SONA', 
            name: 'SONA Token', 
            logo: 'https://via.placeholder.com/40',
            balance: 250.00,
            address: '0xcd97F8B916F1d99272C414D7cb5D1466Ef7BDB1c'
        },
        { 
            symbol: 'WTF', 
            name: 'WTF Token', 
            logo: 'https://via.placeholder.com/40',
            balance: 100.00,
            address: '0x16487b402817744f78482631362e6873d2EdddcC'
        },
        { 
            symbol: 'IPPY', 
            name: 'IPPY Token', 
            logo: 'https://via.placeholder.com/40',
            balance: 75.00,
            address: '0x3DB30395a01FE669563Ef6f4c1adEc031a9f60EA'
        },
        { 
            symbol: 'CRUNCH', 
            name: 'CRUNCH Token', 
            logo: 'https://via.placeholder.com/40',
            balance: 50.00,
            address: '0xb2621056047CbdF37282C24006bd9302061ae94C'
        }
    ];

    // Private state variables
    let fromToken = tokens[0]; // Default from token (PIPE)
    let toToken = tokens[1]; // Default to token (IP)
    let fromAmount = 0;
    let toAmount = 0;
    let currentSelector = null; // Which token selector was clicked

    // Private DOM element references
    let fromAmountInput, toAmountInput, fromTokenSelector, toTokenSelector;
    let fromBalanceEl, toBalanceEl, swapRateEl, swapButton;
    
    // NO MODAL VARIABLES STORED HERE - We'll work with them directly

    // Private methods
    function initSwapInterface() {
        console.log("Attempting to initialize swap interface...");
        
        // Simple check for a few critical elements
        fromAmountInput = document.getElementById('fromAmount');
        toAmountInput = document.getElementById('toAmount');
        
        if (!fromAmountInput || !toAmountInput) {
            console.error("Critical swap elements not found");
            return false;
        }
        
        // Since we found basic elements, get the rest
        fromTokenSelector = document.getElementById('fromTokenSelector');
        toTokenSelector = document.getElementById('toTokenSelector');
        fromBalanceEl = document.getElementById('fromBalance');
        toBalanceEl = document.getElementById('toBalance');
        swapRateEl = document.getElementById('swapRate');
        swapButton = document.getElementById('swapButton');
        
        // Make sure we have all needed elements
        if (!fromTokenSelector || !toTokenSelector || !fromBalanceEl || 
            !toBalanceEl || !swapRateEl || !swapButton) {
            console.error("Some swap interface elements are missing");
            return false;
        }
        
        // Create HTML for inline token selection instead of modal
        createInlineTokenSelector();
        
        // Set initial token information
        updateTokenDisplay();
        updateSwapRate();
        
        // Add event listeners
        fromAmountInput.addEventListener('input', handleFromAmountChange);
        
        // Set up token selector clicks
        fromTokenSelector.addEventListener('click', () => toggleTokenSelector('from'));
        toTokenSelector.addEventListener('click', () => toggleTokenSelector('to'));
        
        const swapDirectionBtn = document.getElementById('swapDirectionBtn');
        if (swapButton) {
            swapButton.addEventListener('click', handleSwap);
            console.log("Swap button event listener attached");
        } else {
            console.error("Swap button not found");
        }
        
        if (swapDirectionBtn) {
            swapDirectionBtn.addEventListener('click', swapTokens);
            console.log("Swap direction button event listener attached");
        } else {
            console.error("Swap direction button not found");
        }
        
        document.addEventListener('click', (event) => {
            if (event.target.closest('#fromTokenSelector') || event.target.closest('#toTokenSelector')) {
                return; // Don't close if clicking the selector button
            }
        
            const fromSelector = document.getElementById('fromTokenSelectorDropdown');
            const toSelector = document.getElementById('toTokenSelectorDropdown');
        
            if (fromSelector && fromSelector.style.display === 'block' &&
                !event.target.closest('#fromTokenSelectorDropdown')) {
                fromSelector.style.display = 'none';
            }
        
            if (toSelector && toSelector.style.display === 'block' &&
                !event.target.closest('#toTokenSelectorDropdown')) {
                toSelector.style.display = 'none';
            }
        });
        
        console.log("Swap interface initialized successfully");
        return true;
    }

    // Create inline token selectors instead of a modal
    function createInlineTokenSelector() {
        // Add needed styles
        const style = document.createElement('style');
            style.textContent = `
                .token-selector-dropdown {
                z-index: 9999 !important;
                position: absolute;
                background-color: #1e1e1e;
                min-width: 200px;
                max-height: 300px;
                overflow-y: auto;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                margin-top: 5px;
                display: none; /* Ensure it starts hidden */
                pointer-events: auto; /* Ensure it is clickable */
            }

            .swap-container, .swap-section {
                overflow: visible !important; /* Ensure dropdowns are not cut off */
                position: relative;
            }
            
            .token-selector-item {
                display: flex;
                align-items: center;
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #333;
            }
            
            .token-selector-item:hover {
                background-color: #2a2a2a;
            }
            
            .token-logo-small {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                margin-right: 10px;
                background-size: cover;
            }
            
            .token-info {
                flex: 1;
            }
            
            .token-symbol-text {
                font-weight: bold;
            }
            
            .token-name-text {
                font-size: 12px;
                color: #999;
            }
            
            .token-balance-text {
                font-size: 12px;
                color: #999;
            }

            .swap-button {
                position: relative;
                z-index: 1; /* Ensure the swap button stays interactive */
            }

            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                z-index: 99999 !important; /* Ensure it's above everything */
                align-items: center;
                justify-content: center;
            }

            .modal-content {
                background: #121212;
                padding: 20px;
                border-radius: 12px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
                z-index: 100000 !important; /* Ensure content stays above other elements */
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .close-modal {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }

            .search-container {
                margin-bottom: 10px;
            }

            .search-container input {
                width: 100%;
                padding: 8px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #1e1e1e;
                color: white;
            }

            .token-list {
                max-height: 300px;
                overflow-y: auto;
            }

            .token-item {
                display: flex;
                align-items: center;
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #333;
            }

            .token-item:hover {
                background-color: #2a2a2a;
            }

            .token-logo {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                margin-right: 10px;
                background-size: cover;
            }

            .token-info {
                flex: 1;
            }

            .token-symbol {
                font-weight: bold;
            }

            .token-name {
                font-size: 12px;
                color: #999;
            }

            .token-balance {
                font-size: 12px;
                color: #999;
            }
        `;
        document.head.appendChild(style);
        
        // Create from token selector dropdown
        const fromDropdown = document.createElement('div');
        fromDropdown.id = 'fromTokenSelectorDropdown';
        fromDropdown.className = 'token-selector-dropdown';
        document.body.appendChild(fromDropdown);
        
        // Create to token selector dropdown
        const toDropdown = document.createElement('div');
        toDropdown.id = 'toTokenSelectorDropdown';
        toDropdown.className = 'token-selector-dropdown';
        document.body.appendChild(toDropdown);
        
        console.log('Token selectors created');
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
            swapButton.textContent = 'Swap';
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

    // Toggle token selector dropdown visibility
    function toggleTokenSelector(type) {
        console.log(`Opening modal for: ${type}`);
    
        const modal = document.getElementById('tokenSelectModal');
    
        if (!modal) {
            console.error("❌ Modal not found in the DOM!");
            return;
        }
    
        console.log(`✅ Modal found. Current display: ${modal.style.display}`);
    
        // If the event was triggered from the modal itself, ignore it
        if (event.target.closest('.modal-content')) {
            console.log("❌ Preventing immediate closing due to internal click.");
            return;
        }
    
        // Prevent accidental double clicks from toggling
        if (modal.style.display === 'flex') {
            console.log(`❌ Modal already open, ignoring duplicate event.`);
            return;
        }
    
        // Populate and show the modal
        currentSelector = type;
        populateTokenModal(type);
        modal.style.display = 'flex';
        console.log(`✅ Modal displayed for: ${type}`);
    }

    // Populate token selector dropdown
    function populateTokenModal(type) {
        const tokenList = document.getElementById('tokenList');
        if (!tokenList) return;
    
        tokenList.innerHTML = ''; // Clear previous entries
    
        tokens.forEach(token => {
            if ((type === 'from' && token.symbol === toToken.symbol) ||
                (type === 'to' && token.symbol === fromToken.symbol)) {
                return; // Prevent selecting the same token
            }
    
            const item = document.createElement('div');
            item.className = 'token-item';
            item.innerHTML = `
                <div class="token-logo" style="background-image: url(${token.logo})"></div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                </div>
                <div class="token-balance">${token.balance.toFixed(2)}</div>
            `;
    
            item.addEventListener('click', () => {
                selectToken(token, type);
                closeTokenModal();
            });
    
            tokenList.appendChild(item);
        });
    }

    function closeTokenModal() {
        document.getElementById('tokenSelectModal').style.display = 'none';
    }

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('tokenSelectModal');
    
        // If clicking inside the modal, do nothing
        if (event.target.closest('.modal-content') || event.target.closest('.token-selector')) {
            return;
        }
    
        // Hide the modal when clicking outside
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            console.log("❌ Modal closed due to outside click.");
        }
    });

    // Select a token
    function selectToken(token, type) {
        if (type === 'from') {
            fromToken = token;
        } else if (type === 'to') {
            toToken = token;
        }
        
        // Update UI
        updateTokenDisplay();
        updateSwapRate();
        
        // Reset amounts
        fromAmountInput.value = '';
        toAmountInput.value = '';
        fromAmount = 0;
        toAmount = 0;
    }

    function handleSwap() {
        console.log(`Swap button clicked - Swapping ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`);
    
        if (fromAmount <= 0 || fromAmount > fromToken.balance) {
            console.error("Invalid swap amount, swap not executed.");
            return;
        }
    
        // Simulate token swap
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

    document.addEventListener("DOMContentLoaded", function () {
        console.log("✅ DOM fully loaded, initializing swap module...");
    
        const modal = document.getElementById('tokenSelectModal');
        if (!modal) {
            console.error("❌ Modal still not found after DOMContentLoaded!");
        } else {
            console.log("✅ Modal found successfully");
            modal.style.display = 'none'; // Hide it on load
        }
    
        window.initSwap();
    });

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
    console.log('initSwap function called');
    window.SwapModule.initialize()
        .then(success => {
            console.log('SwapModule initialization ' + (success ? 'succeeded' : 'failed'));
        })
        .catch(error => {
            console.error('Error during SwapModule initialization:', error);
        });
};
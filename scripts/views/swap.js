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
            address: '0x7D968e89Cb2f9920f1321a75E53feDc573552836'
        },
        { 
            symbol: 'IP', 
            name: 'Infinium Protocol', 
            logo: 'https://via.placeholder.com/40',
            balance: 500.00,
            address: null
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

    const uniswapRouterAddress = "0x674eFAa8C50cBEF923ECe625d3c276B7Bb1c16fB"; // Uniswap V2 Router Address

    const uniswapRouterABI = [
        {
            "constant": false,
            "inputs": [
                { "name": "amountIn", "type": "uint256" },
                { "name": "amountOutMin", "type": "uint256" },
                { "name": "path", "type": "address[]" },
                { "name": "to", "type": "address" },
                { "name": "deadline", "type": "uint256" }
            ],
            "name": "swapExactTokensForTokens",
            "outputs": [{ "name": "amounts", "type": "uint256[]" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                { "name": "amountIn", "type": "uint256" },
                { "name": "path", "type": "address[]" }
            ],
            "name": "getAmountsOut",
            "outputs": [{ "name": "amounts", "type": "uint256[]" }],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const ERC20_ABI = [
        {
            "constant": true,
            "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
            "name": "allowance",
            "outputs": [{ "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
            "name": "approve",
            "outputs": [{ "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{ "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // Function to display transaction status messages in the UI
    function showTransactionStatus(status, message, txHash = null) {
        const container = document.getElementById('txStatusContainer');
        if (!container) {
            console.error("❌ Transaction status container not found!");
            return;
        }

        // Determine styling based on status type
        let statusClass = '';
        switch (status) {
            case 'success':
                statusClass = 'status-success';
                break;
            case 'error':
                statusClass = 'status-error';
                break;
            case 'rejected':
                statusClass = 'status-rejected';
                break;
            default:
                statusClass = '';
        }

        // Create transaction hash link if available
        let hashButton = '';
        if (txHash) {
            const formattedHash = formatTxHash(txHash);
            hashButton = `
                <a class="hash-button" href="https://etherscan.io/tx/${txHash}" target="_blank">
                    ${formattedHash}
                </a>
            `;
        }

        // Update UI
        container.innerHTML = `
            <div class="status-message ${statusClass}">
                ${message}
                ${txHash ? '<div class="hash-container">' + hashButton + '</div>' : ''}
            </div>
        `;

        container.style.display = 'block';
    }

    // Format transaction hash (shorten for display)
    function formatTxHash(hash) {
        if (!hash) return '';
        return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
    }

    async function handleSwap() {
        console.log(`🔄 Swap button clicked - Swapping ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`);
    
        if (fromAmount <= 0 || fromAmount > fromToken.balance) {
            console.error("❌ Invalid swap amount, swap not executed.");
            showTransactionStatus("error", "Invalid swap amount.");
            return;
        }
    
        // Initialize Web3
        const web3 = new Web3('https://aeneid.storyrpc.io/');
    
        const router = new web3.eth.Contract(uniswapRouterABI, uniswapRouterAddress);
        let fromTokenAddress = fromToken.address;
        let toTokenAddress = toToken.address;
        const amountIn = web3.utils.toWei(fromAmount.toString(), "ether");
        const slippageTolerance = 0.5; // 0.5% slippage
    
        try {
            console.log("🔍 Fetching swap details from Uniswap...");
    
            // **Handle IP as Gas Token using WETH**
            const WETH_ADDRESS = "0x1514000000000000000000000000000000000000"; // Mainnet WETH
            if (fromToken.symbol === "IP") fromTokenAddress = WETH_ADDRESS;
            if (toToken.symbol === "IP") toTokenAddress = WETH_ADDRESS;
    
            console.log(`🔹 From: ${fromToken.symbol} (${fromTokenAddress})`);
            console.log(`🔹 To: ${toToken.symbol} (${toTokenAddress})`);
    
            if (fromTokenAddress === toTokenAddress) {
                console.error("❌ Cannot swap the same token!");
                showTransactionStatus("error", "You cannot swap the same token.");
                return;
            }
    
            // **Get Expected Output Amount**
            let amountsOut;
            try {
                console.log(`🟢 Calling getAmountsOut on Uniswap V2 Router`);
                console.log(`   ➤ Input Amount (in Wei): ${amountIn}`);
                console.log(`   ➤ Path: [${fromTokenAddress}, ${toTokenAddress}]`);
    
                amountsOut = await router.methods.getAmountsOut(amountIn, [fromTokenAddress, toTokenAddress]).call();
                console.log(`✅ Expected Output: ${amountsOut[1]}`);
            } catch (error) {
                console.error(`❌ Uniswap getAmountsOut Failed: ${error.message}`);
                showTransactionStatus("error", `Swap Failed: ${error.message}`);
                return;
            }
    
            if (!amountsOut || amountsOut.length < 2) {
                console.error("❌ Invalid response from getAmountsOut.");
                showTransactionStatus("error", "Invalid response from Uniswap.");
                return;
            }
    
            const amountOutMin = BigInt(amountsOut[1]) - (BigInt(amountsOut[1]) * BigInt(slippageTolerance * 100)) / BigInt(10000);
            console.log(`✅ Expected output: ${web3.utils.fromWei(amountOutMin.toString(), "ether")} ${toToken.symbol}`);
    
            const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes from now
    
            // **Retrieve Private Key from Secure Storage**
            const { wallets } = await chrome.storage.local.get("wallets");
    
            if (!wallets || wallets.length === 0) {
                console.error("❌ No wallets found in storage.");
                showTransactionStatus("error", "No wallets found. Please reconnect.");
                return;
            }
    
            const wallet = wallets[1];
            console.log(`🔄 Using wallet: ${wallet.address}`);
    
            // **Create the Swap Transaction**
            console.log("🚀 Using `swapExactTokensForTokens`");
            const tx = router.methods.swapExactTokensForTokens(
                amountIn,
                amountOutMin.toString(),
                [fromTokenAddress, toTokenAddress],
                wallet.address,
                deadline
            );

            // **Decrypt the Private Key**
            const privateKey = await CryptoUtils.getDecryptedPrivateKey(wallet);
    
            if (!privateKey) {
                console.error("❌ Failed to retrieve private key.");
                showTransactionStatus("error", "Failed to retrieve private key.");
                return;
            }
    
            // **Ensure Allowance is Set for ERC-20 Tokens**
            const tokenContract = new web3.eth.Contract(ERC20_ABI, fromTokenAddress);
            // **Check the user's token balance**
            const userBalance = await tokenContract.methods.balanceOf(wallet.address).call();
            console.log(`🔹 User Balance: ${web3.utils.fromWei(userBalance, "ether")} ${fromToken.symbol}`);

            if (BigInt(userBalance) < BigInt(amountIn)) {
                console.error(`❌ Insufficient balance! You have ${web3.utils.fromWei(userBalance, "ether")} ${fromToken.symbol}, but need ${web3.utils.fromWei(amountIn, "ether")}`);
                showTransactionStatus("error", "Insufficient token balance.");
                return;
            }
            const allowance = await tokenContract.methods.allowance(wallet.address, uniswapRouterAddress).call();
            console.log(`🔹 Current Allowance: ${web3.utils.fromWei(allowance, "ether")}`);
    
            if (BigInt(allowance) < BigInt(amountIn)) {
                console.log("❌ Not enough allowance! Approving token...");
    
                const approveTx = tokenContract.methods.approve(uniswapRouterAddress, web3.utils.toWei("999999999", "ether")); // Large number for future swaps
                
                const approveTransaction = {
                    from: wallet.address,
                    to: fromTokenAddress,
                    gas: 100000, // Adjust gas limit if needed
                    gasPrice: await web3.eth.getGasPrice(),
                    data: approveTx.encodeABI(),
                };

                console.log("🔏 Signing approval transaction...");
                const signedApproveTx = await web3.eth.accounts.signTransaction(approveTransaction, privateKey);

                console.log("🚀 Sending approval transaction...");
                const approveReceipt = await web3.eth.sendSignedTransaction(signedApproveTx.rawTransaction);

                console.log(`✅ Approval successful! Tx Hash: ${approveReceipt.transactionHash}`);
            }
    
            // **Estimate Gas**
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = await tx.estimateGas({ from: wallet.address });
    
            console.log(`⛽ Gas Price: ${web3.utils.fromWei(gasPrice, "gwei")} Gwei`);
            console.log(`🔢 Estimated Gas: ${gasLimit}`);
    
            // **Sign and Send Transaction**
            const txData = tx.encodeABI();
            const transaction = {
                from: wallet.address,
                to: uniswapRouterAddress,
                value: "0", // No ETH sent
                gas: gasLimit,
                gasPrice: gasPrice,
                data: txData
            };
    
            
    
            console.log("🔏 Signing transaction...");
            const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
            const txHash = web3.utils.sha3(signedTx.rawTransaction);
            
            console.log("🚀 Sending transaction...");
            
            // Use a Promise with a timeout to avoid hanging if the transaction is already known
            const sendTransaction = () => {
                return new Promise((resolve, reject) => {
                    web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                        .once('transactionHash', (hash) => {
                            console.log(`✅ Transaction sent with hash: ${hash}`);
                            resolve(hash);
                        })
                        .once('receipt', (receipt) => {
                            console.log(`✅ Transaction confirmed with receipt:`, receipt);
                        })
                        .on('error', (error) => {
                            if (error.message.includes('already known')) {
                                console.log(`✅ Transaction was already in mempool with hash: ${txHash}`);
                                resolve(txHash);
                            } else {
                                reject(error);
                            }
                        });
                });
            };

            // Send the transaction and get the hash
            const finalTxHash = await sendTransaction();
            
            // Display success message
            console.log(`✅ Swap successfully submitted with hash: ${finalTxHash}`);
            showTransactionStatus("success", `Swap submitted! Transaction hash: ${finalTxHash}`);

            // Update UI
            updateTokenDisplay();
            
            // Reset inputs
            fromAmountInput.value = '';
            toAmountInput.value = '';
            fromAmount = 0;
            toAmount = 0;
            
            // Update button state
            validateSwapButton();
    
        } catch (error) {
            console.error("❌ Swap failed:", error);
    
            // Show error message in UI
            showTransactionStatus("error", `Transaction Failed: ${error.message}`);
        }
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
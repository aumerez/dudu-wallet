// transfer.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Transfer page loaded");
    
    // Token configurations
    const TOKENS = {
        'IP': {
            symbol: 'IP',
            name: 'IP Token',
            isNative: true,
            color: '#4CAF50'
        },
        'PIPE': {
            symbol: 'PIPE',
            name: 'PIPE Token',
            isNative: false,
            address: '0xB425282FEAe46277e8D6a2A4EEF7A09EFCAA8B8F',
            color: '#7848F4'
        }
        // Add more tokens here as needed
    };
    
    // ERC20 ABI for token interactions
    const ERC20_ABI = [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "success", "type": "bool"}],
            "type": "function"
        }
    ];

    // Get wallet address and token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const address = urlParams.get('address');
    const tokenSymbol = urlParams.get('token') || 'IP'; // Default to IP if not specified
    
    // Get token configuration
    const token = TOKENS[tokenSymbol];
    if (!token) {
        console.error(`Unknown token: ${tokenSymbol}`);
        window.location.href = '../views/popup.html';
        return;
    }
    
    // Update UI with token information
    document.getElementById('transferTitle').textContent = `Transfer ${token.symbol}`;
    document.getElementById('tokenSymbol').textContent = token.symbol;
    document.getElementById('confirmTransfer').textContent = `Send ${token.symbol}`;
    document.getElementById('confirmTransfer').style.backgroundColor = token.color;

    if (!address) {
        console.error("No address in URL parameters");
        window.location.href = '../views/popup.html';
        return;
    }

    // Get wallet details from storage
    try {
        const { wallets = [] } = await chrome.storage.local.get('wallets');
        const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
        
        if (!wallet) {
            console.error("Wallet not found in storage");
            window.location.href = '../views/popup.html';
            return;
        }

        const web3 = new Web3("https://aeneid.storyrpc.io/");

        // Update available balance based on token type
        try {
            let balance;
            
            if (token.isNative) {
                // For native token (IP)
                balance = await web3.eth.getBalance(address);
            } else {
                // For ERC20 tokens
                const tokenContract = new web3.eth.Contract(ERC20_ABI, token.address);
                balance = await tokenContract.methods.balanceOf(address).call();
            }
            
            const formattedBalance = web3.utils.fromWei(balance, 'ether');
            document.getElementById('availableBalance').textContent = `${parseFloat(formattedBalance).toFixed(6)} ${token.symbol}`;
        } catch (error) {
            console.error(`Error fetching ${token.symbol} balance:`, error);
            document.getElementById('availableBalance').textContent = `Error loading ${token.symbol} balance`;
        }

        // Handle back button
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = `wallet-details.html?address=${address}`;
        });

        // Handle transfer confirmation
        document.getElementById('confirmTransfer').addEventListener('click', async () => {
            const recipientAddress = document.getElementById('recipientAddress').value;
            const amount = document.getElementById('amount').value;
            const confirmButton = document.getElementById('confirmTransfer');
            const errorDiv = document.getElementById('error');
            
            // Basic validation
            if (!web3.utils.isAddress(recipientAddress)) {
                errorDiv.textContent = 'Invalid recipient address';
                errorDiv.style.display = 'block';
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                errorDiv.textContent = 'Invalid amount';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                confirmButton.disabled = true;
                confirmButton.textContent = 'Sending...';
                errorDiv.style.display = 'none';

                // Get decrypted private key
                const privateKey = await CryptoUtils.getDecryptedPrivateKey(wallet);
                
                // Convert amount to wei
                const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
                
                let tx;
                
                if (token.isNative) {
                    // Native token transfer (IP)
                    const nonce = await web3.eth.getTransactionCount(address);
                    const gasPrice = await web3.eth.getGasPrice();
                    const gasLimit = 21000; // Standard gas limit for native transfers
                    
                    tx = {
                        from: address,
                        to: recipientAddress,
                        value: amountInWei,
                        gas: gasLimit,
                        gasPrice: gasPrice,
                        nonce: nonce
                    };
                } else {
                    // ERC20 token transfer
                    const tokenContract = new web3.eth.Contract(ERC20_ABI, token.address);
                    const transferData = tokenContract.methods.transfer(recipientAddress, amountInWei).encodeABI();
                    
                    const nonce = await web3.eth.getTransactionCount(address);
                    const gasPrice = await web3.eth.getGasPrice();
                    
                    // Estimate gas for ERC20 transfer
                    let gasLimit;
                    try {
                        gasLimit = await web3.eth.estimateGas({
                            from: address,
                            to: token.address,
                            data: transferData
                        });
                        // Add some buffer to the gas limit
                        gasLimit = Math.floor(gasLimit * 1.2);
                    } catch (gasError) {
                        console.error('Error estimating gas:', gasError);
                        // Use a higher default gas limit for ERC20 transfers
                        gasLimit = 100000;
                    }
                    
                    tx = {
                        from: address,
                        to: token.address,
                        data: transferData,
                        gas: gasLimit,
                        gasPrice: gasPrice,
                        nonce: nonce
                    };
                }

                console.log("Transaction object:", tx);

                // Sign and send transaction
                const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
                console.log("Signed transaction:", signedTx);
                
                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                console.log("Transaction receipt:", receipt);

                // Save transaction to history
                await saveTransactionToHistory({
                    hash: receipt.transactionHash,
                    from: address,
                    to: token.isNative ? tx.to : token.address,
                    value: amountInWei,
                    token: token.symbol,
                    status: 'success',
                    timestamp: Date.now()
                });

                // Transaction successful
                confirmButton.textContent = 'Sent!';
                setTimeout(() => {
                    window.location.href = `wallet-details.html?address=${address}`;
                }, 2000);

            } catch (error) {
                console.error('Transfer error:', error);
                
                // Save failed transaction to history
                try {
                    await saveTransactionToHistory({
                        from: address,
                        to: recipientAddress,
                        value: web3.utils.toWei(amount.toString(), 'ether'),
                        token: token.symbol,
                        status: 'failed',
                        error: error.message,
                        timestamp: Date.now()
                    });
                } catch (historyError) {
                    console.error('Error saving transaction history:', historyError);
                }
                
                confirmButton.disabled = false;
                confirmButton.textContent = `Send ${token.symbol}`;
                errorDiv.textContent = 'Transfer failed: ' + (error.message || 'Unknown error');
                errorDiv.style.display = 'block';
            }
        });
    } catch (error) {
        console.error("Error initializing transfer page:", error);
        window.location.href = '../views/popup.html';
    }
});

// Function to save transaction to history
async function saveTransactionToHistory(transaction) {
    try {
        // Get existing transaction history
        const result = await chrome.storage.local.get('transactionHistory');
        const history = result.transactionHistory || [];
        
        // Add new transaction to history
        history.unshift(transaction);
        
        // Limit history size if needed
        const maxHistorySize = 50;
        const trimmedHistory = history.slice(0, maxHistorySize);
        
        // Save updated history
        await chrome.storage.local.set({ transactionHistory: trimmedHistory });
        console.log('Transaction saved to history:', transaction);
    } catch (error) {
        console.error('Error saving transaction history:', error);
    }
}
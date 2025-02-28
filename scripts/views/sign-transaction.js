// sign-transaction.js
// Store explorer URL in a constant that can be exported to other modules
const EXPLORER_URL = 'https://aeneid.storyscan.xyz';

// Save explorer URL to storage for access by other components
async function saveExplorerUrl() {
    await chrome.storage.local.set({ explorerUrl: EXPLORER_URL });
}

window.onload = async () => {
    console.log("sign-transaction.js loaded and document is ready!");
    
    // Save explorer URL to storage
    saveExplorerUrl();

    try {
        // Get the pending transaction from storage
        const result = await chrome.storage.local.get('pendingTransaction');
        console.log("Storage result:", result);

        const pendingTransaction = result.pendingTransaction;
        if (!pendingTransaction) {
            console.error('No pending transaction found');
            
            // Instead of just showing an error, redirect to the main wallet view
            setTimeout(() => {
                window.location.href = "popup.html";
            }, 500);
            
            // Show a temporary message while redirecting
            document.body.innerHTML = "<h3>No pending transaction found. Redirecting to wallet...</h3>";
            return;
        }

        console.log('Retrieved transaction:', pendingTransaction);

        // Initialize Web3
        const web3 = new Web3('https://aeneid.storyrpc.io/');

        // Format values
        const valueInIP = web3.utils.fromWei(pendingTransaction.value || '0', 'ether');
        const gasPriceGwei = web3.utils.fromWei(pendingTransaction.gasPrice || '0', 'gwei');
        const estimatedFee = (Number(pendingTransaction.gas) * Number(gasPriceGwei) * 1e-9).toFixed(6);

        // Update UI
        document.getElementById('fromAddress').textContent = pendingTransaction.from;
        document.getElementById('toAddress').textContent = pendingTransaction.to;
        document.getElementById('amount').textContent = `${valueInIP} IP`;
        document.getElementById('gasInfo').textContent = `${estimatedFee} IP`;

        // Create a transaction status element
        const statusContainer = document.createElement('div');
        statusContainer.id = 'txStatusContainer';
        statusContainer.className = 'tx-status-container';
        statusContainer.style.display = 'none';
        
        // Create a back button (initially hidden)
        const backButton = document.createElement('button');
        backButton.id = 'backBtn';
        backButton.className = 'btn-secondary back-button';
        backButton.textContent = 'Back to Wallet';
        backButton.style.display = 'none';
        backButton.addEventListener('click', () => {
            window.location.href = "popup.html";
        });
        
        // Add elements to container
        document.querySelector('.container').appendChild(statusContainer);
        document.querySelector('.container').appendChild(backButton);

        setTimeout(() => {
            console.log("Attempting to attach event listeners...");

            const signBtn = document.getElementById('signBtn');
            const rejectBtn = document.getElementById('rejectBtn');

            console.log("Sign button:", signBtn);
            console.log("Reject button:", rejectBtn);

            if (!signBtn || !rejectBtn) {
                console.error("Buttons not found in DOM");
                return;
            }

            // ✅ SIGN TRANSACTION
            signBtn.addEventListener('click', async () => {
                console.log("Sign button clicked");
                try {
                    // Show loading state
                    signBtn.disabled = true;
                    rejectBtn.disabled = true;
                    signBtn.textContent = "Signing...";
                    
                    const { wallets } = await chrome.storage.local.get('wallets');
                    console.log("Wallet storage:", wallets);

                    // Find the wallet corresponding to the sender's address
                    const wallet = wallets.find(w => w.address.toLowerCase() === pendingTransaction.from.toLowerCase());
                    if (!wallet) throw new Error('Wallet not found');

                    console.log("Found wallet:", wallet);

                    // Get private key (Make sure CryptoUtils.decryptPrivateKey is implemented securely)
                    const privateKey = await CryptoUtils.getDecryptedPrivateKey(wallet);
                    console.log("Private key decrypted successfully");

                    // Prepare transaction data
                    const nonce = await web3.eth.getTransactionCount(pendingTransaction.from, "pending");
                    console.log("Nonce:", nonce);

                    const transactionData = {
                        to: pendingTransaction.to,
                        value: pendingTransaction.value,
                        gas: pendingTransaction.gas,
                        gasPrice: pendingTransaction.gasPrice,
                        nonce: nonce
                    };

                    console.log("Transaction data:", transactionData);

                    // ✅ SIGN the transaction
                    const signedTx = await web3.eth.accounts.signTransaction(transactionData, privateKey);
                    console.log("Signed transaction:", signedTx);

                    // ✅ BROADCAST TRANSACTION
                    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                    console.log("Transaction sent successfully:", receipt);

                    // Save transaction history
                    await saveTransactionToHistory({
                        hash: receipt.transactionHash,
                        from: pendingTransaction.from,
                        to: pendingTransaction.to,
                        value: pendingTransaction.value,
                        status: 'success',
                        timestamp: Date.now()
                    });

                    // Clear pending transaction
                    await chrome.storage.local.remove('pendingTransaction');

                    // Notify background script that transaction was completed
                    await chrome.runtime.sendMessage({
                        method: "transactionComplete",
                        params: [receipt]
                    });

                    // Format hash for display
                    const formattedHash = formatTxHash(receipt.transactionHash);
                    
                    // Show success message with clickable hash
                    showTransactionStatus('success', `Transaction successful!`, receipt.transactionHash);
                    
                    // Show back button instead of auto-redirecting
                    const backBtn = document.getElementById('backBtn');
                    if (backBtn) {
                        backBtn.style.display = 'block';
                    }
                    
                } catch (error) {
                    console.error('Error signing transaction:', error);
                    
                    // Save failed transaction to history
                    await saveTransactionToHistory({
                        from: pendingTransaction.from,
                        to: pendingTransaction.to,
                        value: pendingTransaction.value,
                        status: 'failed',
                        error: error.message,
                        timestamp: Date.now()
                    });
                    
                    // Show error in UI instead of alert
                    showTransactionStatus('error', `Transaction Failed: ${error.message}`);
                    
                    // Show back button
                    const backBtn = document.getElementById('backBtn');
                    if (backBtn) {
                        backBtn.style.display = 'block';
                    }
                    
                    // Re-enable buttons after error
                    signBtn.disabled = false;
                    rejectBtn.disabled = false;
                    signBtn.textContent = "Sign";
                }
            });

            // ✅ HANDLE REJECT BUTTON
            rejectBtn.addEventListener('click', async () => {
                console.log("Reject button clicked");
                
                // Save rejected transaction to history
                await saveTransactionToHistory({
                    from: pendingTransaction.from,
                    to: pendingTransaction.to,
                    value: pendingTransaction.value,
                    status: 'rejected',
                    timestamp: Date.now()
                });
                
                await chrome.storage.local.remove('pendingTransaction');
                
                // Show rejection message
                showTransactionStatus('rejected', 'Transaction rejected');
                
                // Show back button instead of auto-redirecting
                const backBtn = document.getElementById('backBtn');
                if (backBtn) {
                    backBtn.style.display = 'block';
                }
            });

            console.log("Event listeners attached successfully!");
        }, 500);
    } catch (error) {
        console.error('Error in sign-transaction:', error);
        
        // Show error message and redirect
        document.body.innerHTML = `<h3>Error: ${error.message}</h3>
                                  <p>Redirecting to wallet...</p>`;
        
        setTimeout(() => {
            window.location.href = "popup.html";
        }, 3000);
    }
};

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

// Format transaction hash to 0xabcd...1234 format
function formatTxHash(hash) {
    if (!hash) return '';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
}

// Function to display transaction status
// Function to display transaction status
function showTransactionStatus(status, message, txHash = null) {
    const container = document.getElementById('txStatusContainer');
    if (!container) return;
    
    // Set status styling based on type
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
    
    // Create hash link if transaction hash exists
    let hashButton = '';
    if (txHash) {
        const formattedHash = formatTxHash(txHash);
        // Changed from button to a proper link with styling
        hashButton = `
            <a 
                class="hash-button" 
                href="${EXPLORER_URL}/tx/${txHash}"
                target="_blank"
            >
                ${formattedHash}
            </a>
        `;
    }
    
    // Update container content
    container.innerHTML = `
        <div class="status-message ${statusClass}">
            ${message}
            ${txHash ? '<div class="hash-container">' + hashButton + '</div>' : ''}
        </div>
    `;
    
    container.style.display = 'block';
}
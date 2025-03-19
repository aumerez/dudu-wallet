// scripts/views/ip.js

// Global initialization function that will be called when the IP view is loaded
window.initIP = function() {
    console.log('Initializing IP view');
    
    // Wait a short moment to ensure the HTML is fully rendered
    setTimeout(() => {
        initializeIPView();
    }, 300); // 300ms delay
};

function initializeIPView() {
    // Contract ABI for the register function
    const ipAssetRegistryABI = [
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "chainid",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "tokenContract",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "register",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "id",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];
    
    // Contract address from your requirements
    const contractAddress = '0x77319B4031e6eF1250907aa00018B8B1c67a244b';
    
    // Documentation button listener
    const docButton = document.querySelector('.ip-action-button');
    if (docButton) {
        docButton.addEventListener('click', () => {
            console.log('Opening documentation');
            chrome.tabs.create({ url: 'https://docs.story.foundation' });
        });
        console.log('Documentation button found and event listener attached');
    } else {
        console.error('Documentation button not found. DOM elements available:', 
                     document.querySelectorAll('button').length,
                     'Elements with .ip-action-button:', 
                     document.querySelectorAll('.ip-action-button').length);
    }
    
    // Register button listener
    const registerButton = document.querySelector('.ip-register-button');
    if (registerButton) {
        registerButton.addEventListener('click', handleRegisterClick);
        console.log('Register button found and event listener attached');
    } else {
        console.error('Register button not found');
    }
    
    // Gets the first wallet from local storage
    async function getFirstWallet() {
        const { wallets } = await chrome.storage.local.get('wallets');
        
        if (!wallets || wallets.length === 0) {
            throw new Error('No wallets found');
        }
        
        return wallets[1];
    }
    
    // Get the network settings
    function getNetworkSettings() {
        return {
            chainId: 1315,  // Fixed network ID
            rpcUrl: 'https://aeneid.storyrpc.io/'  // Fixed RPC URL
        };
    }
    
    // Handler function for the register button click
    async function handleRegisterClick() {
        console.log('Register button clicked');
        
        const tokenContract = document.getElementById('tokenContract').value;
        const tokenId = document.getElementById('tokenId').value;
        
        // Validate inputs
        if (!tokenContract || !tokenId) {
            updateStatus('Please provide both contract address and token ID', 'error');
            return;
        }
        
        // Validate contract address format
        if (!tokenContract.startsWith('0x') || tokenContract.length !== 42) {
            updateStatus('Invalid contract address format', 'error');
            return;
        }
        
        // Validate token ID is a number
        if (isNaN(tokenId)) {
            updateStatus('Token ID must be a number', 'error');
            return;
        }
        
        try {
            updateStatus('Preparing transaction...', 'info');
            
            // Get wallet and network settings
            const wallet = await getFirstWallet();
            const networkInfo = getNetworkSettings();
            
            console.log(`Using wallet address ${wallet.address} on chain ${networkInfo.chainId}`);
            
            // Create web3 instance with the RPC URL
            const web3 = new Web3(networkInfo.rpcUrl);
            
            // Get the private key from the wallet using CryptoUtils
            const privateKey = await CryptoUtils.getDecryptedPrivateKey(wallet);
            
            // Add wallet private key to web3
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            web3.eth.accounts.wallet.add(account);
            web3.eth.defaultAccount = account.address;
            
            // Create contract instance
            const contract = new web3.eth.Contract(ipAssetRegistryABI, contractAddress);
            
            updateStatus('Sending transaction...', 'info');
            
            // Try to estimate gas, but use fallback if it fails
            let gasEstimate;
            try {
                gasEstimate = await contract.methods.register(
                    networkInfo.chainId,
                    tokenContract,
                    tokenId
                ).estimateGas({ from: account.address });
                console.log('Gas estimate:', gasEstimate);
            } catch (error) {
                console.warn('Gas estimation failed:', error);
                gasEstimate = 300000; // Fallback gas limit
                console.log('Using fallback gas limit:', gasEstimate);
            }
            
            // Send transaction
            const result = await contract.methods.register(
                networkInfo.chainId,
                tokenContract,
                tokenId
            ).send({
                from: account.address,
                gas: Math.ceil(gasEstimate * 1.2), // Add 20% buffer to gas estimate
                gasPrice: await web3.eth.getGasPrice()
            });
            
            console.log('Transaction successful:', result);
            
            // Update UI with success
            updateStatus('Registration successful!', 'success');
            document.getElementById('ip-transaction-hash').innerHTML = 
                `Transaction hash: <a href="https://etherscan.io/tx/${result.transactionHash}" target="_blank">${result.transactionHash}</a>`;
            
        } catch (error) {
            console.error('Registration error:', error);
            updateStatus(`Error: ${error.message || 'Transaction failed'}`, 'error');
        }
    }
    
    // Helper function to update status message
    function updateStatus(message, type) {
        const statusElement = document.getElementById('ip-status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = type || '';
            
            // Clear transaction hash if there's an error
            if (type === 'error') {
                const txHashElement = document.getElementById('ip-transaction-hash');
                if (txHashElement) {
                    txHashElement.innerHTML = '';
                }
            }
        }
    }
    
    // Display the first wallet address
    getFirstWallet()
        .then(wallet => {
            const statusElement = document.getElementById('ip-status-message');
            if (statusElement && wallet.address) {
                statusElement.textContent = `Wallet: ${wallet.address.substring(0, 6)}...${wallet.address.substring(38)}`;
                statusElement.className = 'success';
            }
        })
        .catch(error => {
            console.error('Error getting wallet:', error);
            updateStatus('No wallets found. Please create or import a wallet.', 'error');
        });
};
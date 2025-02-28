// scripts/views/ip.js

// Global initialization function that will be called when the IP view is loaded
window.initIP = function() {
    console.log('Initializing IP view');
    
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
            window.open('https://docs.story.foundation', '_blank');
        });
    } else {
        console.error('Documentation button not found');
    }
    
    // Register button listener
    const registerButton = document.querySelector('.ip-register-button');
    if (registerButton) {
        registerButton.addEventListener('click', async () => {
            const tokenContract = document.getElementById('tokenContract').value;
            const tokenId = document.getElementById('tokenId').value;
            
            // Validate inputs
            if (!tokenContract || !tokenId) {
                updateStatus('Please provide both contract address and token ID', 'error');
                return;
            }
            
            if (!window.ethereum) {
                updateStatus('MetaMask or compatible wallet not detected', 'error');
                return;
            }
            
            try {
                // Get current chain ID from the connected provider
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const decimalChainId = parseInt(chainId, 16);
                
                // Request account access
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const userAccount = accounts[0];
                
                // Create Web3 instance and contract instance
                const web3 = new Web3(window.ethereum);
                const ipAssetRegistry = new web3.eth.Contract(ipAssetRegistryABI, contractAddress);
                
                updateStatus('Processing transaction...', 'info');
                
                // Call the register function
                const tx = await ipAssetRegistry.methods.register(
                    decimalChainId, 
                    tokenContract, 
                    tokenId
                ).send({ from: userAccount });
                
                // Update status with success message and transaction hash
                updateStatus('Registration successful!', 'success');
                document.getElementById('ip-transaction-hash').innerHTML = 
                    `Transaction hash: <a href="https://etherscan.io/tx/${tx.transactionHash}" target="_blank">${tx.transactionHash}</a>`;
                
                // Get the returned IP ID (address)
                if (tx.events && tx.events.IPRegistered) {
                    const ipId = tx.events.IPRegistered.returnValues.id;
                    document.getElementById('ip-transaction-hash').innerHTML += 
                        `<br>IP Asset ID: <a href="https://etherscan.io/address/${ipId}" target="_blank">${ipId}</a>`;
                }
                
            } catch (error) {
                console.error('Registration error:', error);
                updateStatus(
                    `Error: ${error.message || 'Transaction failed'}`, 
                    'error'
                );
            }
        });
    } else {
        console.error('Register button not found');
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
    
    // Check if the wallet is connected and show the current account
    async function checkWalletConnection() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    const statusElement = document.getElementById('ip-status-message');
                    if (statusElement) {
                        statusElement.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
                        statusElement.className = 'success';
                    }
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    }
    
    // Initialize wallet connection check
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', checkWalletConnection);
    }
};
// wallet-details.js
window.WalletDetailsModule = (function() {
    // Private variables
    let address;
    let showPrivateKeyBtn;
    let privateKeyContainer;
    let privateKeyValue;
    let copyPrivateKeyBtn;
    let passwordModal;
    let passwordInput;
    let passwordError;
    let confirmPasswordBtn;
    let cancelPasswordBtn;
    let currentWallet;

    // Function to initialize event listeners
    function initEventListeners() {
        if (!address) {
            console.error("No address provided");
            window.location.href = '../views/popup.html';
            return;
        }

        showPrivateKeyBtn.addEventListener('click', () => {
            passwordModal.style.display = 'flex';
            passwordInput.value = ''; // Clear any previous input
            passwordError.style.display = 'none';
        });

        cancelPasswordBtn.addEventListener('click', () => {
            passwordModal.style.display = 'none';
        });
        
        copyPrivateKeyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(privateKeyValue.textContent)
                .then(() => {
                    const originalText = copyPrivateKeyBtn.textContent;
                    copyPrivateKeyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyPrivateKeyBtn.textContent = originalText;
                    }, 2000);
                })
                .catch(err => console.error('Error copying private key:', err));
        });

        confirmPasswordBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            
            try {
                const { salt } = await chrome.storage.local.get('salt');
                
                // Generate encryption key from password
                const key = await CryptoUtils.generateEncryptionKey(password, new Uint8Array(salt));
                
                // Export key to compare with stored key
                const exportedKey = await crypto.subtle.exportKey('raw', key);
                const { encryptionKey: storedKey } = await chrome.storage.local.get('encryptionKey');
                
                // Compare keys
                const newKeyArray = Array.from(new Uint8Array(exportedKey));
                const keysMatch = newKeyArray.length === storedKey.length && 
                                 newKeyArray.every((value, index) => value === storedKey[index]);
                
                if (keysMatch) {
                    const privateKey = await CryptoUtils.getDecryptedPrivateKey(currentWallet);
                    privateKeyValue.textContent = privateKey;
                    privateKeyContainer.style.display = 'block';
                    showPrivateKeyBtn.style.display = 'none';
                    passwordModal.style.display = 'none';
                } else {
                    throw new Error('Incorrect password');
                }
            } catch (error) {
                console.error('Password verification error:', error);
                passwordError.textContent = 'Incorrect password';
                passwordError.style.display = 'block';
            }
        });
        
        // Close modal when clicking outside
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                passwordModal.style.display = 'none';
            }
        });

        // Handle back button
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = '../views/popup.html';
        });

        // Add event listeners for the Send buttons using the unified transfer page
        document.getElementById('transferIPButton').addEventListener('click', () => {
            window.location.href = `transfer.html?address=${address}&token=IP`;
        });
        
        document.getElementById('transferPIPEButton').addEventListener('click', () => {
            window.location.href = `transfer.html?address=${address}&token=PIPE`;
        });
    }

    // Function to load wallet details
    async function loadWalletDetails() {
        try {
            const { wallets = [] } = await chrome.storage.local.get('wallets');
            console.log("All wallets:", wallets);
            
            currentWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
            console.log('Current wallet:', currentWallet);
            
            if (!currentWallet) {
                console.error("Wallet not found in storage");
                window.location.href = '../views/popup.html';
                return;
            }

            // Update UI with wallet info
            document.querySelector('.wallet-name').textContent = currentWallet.name || 'My Wallet';
            document.querySelector('.wallet-address').textContent = currentWallet.address;

            // Get IP balance
            await updateBalances();
        } catch (error) {
            console.error("Error initializing wallet details:", error);
            window.location.href = '../views/popup.html';
        }
    }

    // Function to update wallet balances
    async function updateBalances() {
        try {
            const web3 = new Web3("https://aeneid.storyrpc.io/");
            const balance = await web3.eth.getBalance(address);
            const balanceIP = web3.utils.fromWei(balance, 'ether');
            document.getElementById('storyBalance').textContent = `${parseFloat(balanceIP).toFixed(6)} IP`;
            
            // Get PIPE token balance
            try {
                const pipeBalance = await getPIPEBalance(web3, address);
                document.getElementById('pipeBalance').textContent = `${parseFloat(pipeBalance).toFixed(6)} PIPE`;
            } catch (pipeError) {
                console.error('Error fetching PIPE balance:', pipeError);
                document.getElementById('pipeBalance').textContent = 'Error loading PIPE balance';
            }
        } catch (error) {
            console.error('Error fetching IP balance:', error);
            document.getElementById('storyBalance').textContent = 'Error loading IP balance';
            document.getElementById('pipeBalance').textContent = 'Error loading PIPE balance';
        }
    }

    // Helper function to get PIPE balance
    async function getPIPEBalance(web3, address) {
        // PIPE Token Contract Address
        const PIPE_CONTRACT_ADDRESS = '0x7D968e89Cb2f9920f1321a75E53feDc573552836';
        
        // Standard ERC20 ABI (minimized to just what we need for balanceOf)
        const ERC20_ABI = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            }
        ];
        
        try {
            console.log("Fetching PIPE balance for address:", address);
            const pipeContract = new web3.eth.Contract(ERC20_ABI, PIPE_CONTRACT_ADDRESS);
            console.log("PIPE contract initialized");
            
            const balance = await pipeContract.methods.balanceOf(address).call();
            console.log("Raw PIPE balance:", balance);
            
            // Usually ERC20 tokens use 18 decimals
            const formattedBalance = web3.utils.fromWei(balance, 'ether');
            console.log("Formatted PIPE balance:", formattedBalance);
            
            return formattedBalance;
        } catch (error) {
            console.error('Error in getPIPEBalance:', error);
            throw error;
        }
    }

    // Main initialization function
    function init() {
        console.log("WalletDetailsModule initializing");
        
        // Initialize with a delay to ensure DOM is ready
        setTimeout(() => {
            // Get wallet address from URL parameters or global variable
        chrome.storage.local.get(['activeWallet'], function(result) {
                    address = result.activeWallet || window.ACTIVE_WALLET;
                    
                    if (!address) {
                        console.error("No active wallet address found");
                        window.location.href = '../views/popup.html';
                        return;
                    }

            console.log("Active wallet address:", address);
            
            // Initialize DOM elements
            showPrivateKeyBtn = document.getElementById('showPrivateKeyBtn');
            privateKeyContainer = document.getElementById('privateKeyContainer');
            privateKeyValue = document.getElementById('privateKeyValue');
            copyPrivateKeyBtn = document.getElementById('copyPrivateKeyBtn');
            passwordModal = document.getElementById('passwordModal');
            passwordInput = document.getElementById('passwordInput');
            passwordError = document.getElementById('passwordError');
            confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
            cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
            
            console.log("DOM elements found:", {
                showPrivateKeyBtn: !!showPrivateKeyBtn,
                privateKeyContainer: !!privateKeyContainer,
                privateKeyValue: !!privateKeyValue,
                copyPrivateKeyBtn: !!copyPrivateKeyBtn,
                passwordModal: !!passwordModal
            });
            
            // Initialize events and load wallet details
            initEventListeners();
            loadWalletDetails();
        });
        }, 100);
    }

    // Refresh wallet data
    function refresh() {
        console.log("Refreshing wallet details");
        updateBalances();
    }

    // Return public API
    return {
        init: init,
        refresh: refresh,
        // Expose for debugging
        updateBalances: updateBalances
    };
})();

// Multiple ways to ensure initialization happens
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded event fired for wallet details");
    window.WalletDetailsModule.init();
});

// Additional initialization for when content is loaded dynamically
function initWalletDetailsModule() {
    console.log("initWalletDetailsModule called");
    window.WalletDetailsModule.init();
}

// Expose for immediate execution if needed
window.initWalletDetailsModule = initWalletDetailsModule;

// Fallback initialization
setTimeout(function() {
    console.log("Fallback initialization triggered for wallet details");
    window.WalletDetailsModule.init();
}, 500);
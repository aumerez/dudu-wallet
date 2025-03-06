// setup.js

// Setup module encapsulation
const WalletSetupModule = (function() {

    // Utility Functions
    function copyAddress(address) {
        navigator.clipboard.writeText(address)
            .then(() => alert('Address copied to clipboard!'))
            .catch(err => console.error('Error copying address:', err));
    }
    
    // Setup Functions
    function setupVerification() {
        const indices = [];
        while (indices.length < 3) {
            const index = Math.floor(Math.random() * 12);
            if (!indices.includes(index)) {
                indices.push(index);
            }
        }
        indices.sort((a, b) => a - b);
        window.wordsToVerify = indices;
    
        const verificationInputs = document.getElementById('verificationInputs');
        verificationInputs.innerHTML = indices.map(index => `
            <div class="input-group">
                <label>Word #${index + 1}</label>
                <input type="text" data-index="${index}" class="word-verify">
            </div>
        `).join('');
    }
    
    // Main Event Listener
    document.addEventListener('DOMContentLoaded', async () => {
        // Initialize window variables
        window.currentMnemonic = window.currentMnemonic || null;
        window.wordsToVerify = window.wordsToVerify || null;
        window.pendingWalletName = window.pendingWalletName || null;
    
        // Get all screen elements
        const setupScreen = document.getElementById('setupScreen');
        const createWalletScreen = document.getElementById('createWalletScreen');
        const createWalletNameScreen = document.getElementById('createWalletNameScreen');
        const mnemonicScreen = document.getElementById('mnemonicScreen');
        const verificationScreen = document.getElementById('verificationScreen');
        const importScreen = document.getElementById('importScreen');
    
        // Hide all screens initially
        [setupScreen, createWalletScreen, createWalletNameScreen, mnemonicScreen, 
         verificationScreen, importScreen].forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
    
        return {
            init: function() {
                console.log('WalletSetupModule initialized');
                // All initialization is handled by the DOMContentLoaded event listener already
            }
        };
    })();
    
    // Export module initialization function
    window.initWalletSetup = function() {
        console.log('initWalletSetup executed');
        WalletSetupModule.init();
    };
    
    // Ejecutar la inicialización cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded in wallet-setup.js');
        
        // Initialize module if not already called from outside
        if (typeof window.walletSetupInitialized === 'undefined') {
            window.walletSetupInitialized = true;
            window.initWalletSetup();
        }
    });
    
        // Get stored state
        const { hasPassword } = await chrome.storage.local.get('hasPassword');
        const { wallets = [] } = await chrome.storage.local.get('wallets');
    
        // Show appropriate initial screen
        if (!hasPassword) {
            setupScreen.classList.add('active');
        } else if (wallets.length > 0) {
            // Redirect to wallets screen or main app
            window.location.href = chrome.runtime.getURL('views/wallets.html');
        } else {
            createWalletScreen.classList.add('active');
        }
    
        // Password Setup Handler
        const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
        if (confirmPasswordBtn) {
            confirmPasswordBtn.addEventListener('click', async () => {
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const passwordError = document.getElementById('passwordError');
    
                if (password !== confirmPassword) {
                    passwordError.style.display = 'block';
                    return;
                }
    
                try {
                    const salt = crypto.getRandomValues(new Uint8Array(16));
                    const encoder = new TextEncoder();
                    const passwordBuffer = encoder.encode(password);
                    
                    const key = await crypto.subtle.importKey(
                        'raw',
                        passwordBuffer,
                        { name: 'PBKDF2' },
                        false,
                        ['deriveBits', 'deriveKey']
                    );
    
                    const encryptionKey = await crypto.subtle.deriveKey(
                        {
                            name: 'PBKDF2',
                            salt: salt,
                            iterations: 100000,
                            hash: 'SHA-256'
                        },
                        key,
                        { name: 'AES-GCM', length: 256 },
                        true,
                        ['encrypt', 'decrypt']
                    );
    
                    await chrome.storage.local.set({
                        salt: Array.from(salt),
                        hasPassword: true
                    });
    
                    const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
                    await chrome.storage.local.set({
                        encryptionKey: Array.from(new Uint8Array(exportedKey))
                    });
    
                    document.getElementById('password').value = '';
                    document.getElementById('confirmPassword').value = '';
    
                    setupScreen.classList.remove('active');
                    createWalletScreen.classList.add('active');
                } catch (error) {
                    console.error('Error during password setup:', error);
                    passwordError.textContent = 'Error setting up password';
                    passwordError.style.display = 'block';
                }
            });
        }
    
        // Create New Wallet Flow
        const createNewWalletBtn = document.getElementById('createNewWallet');
        if (createNewWalletBtn) {
            createNewWalletBtn.addEventListener('click', () => {
                createWalletScreen.classList.remove('active');
                createWalletNameScreen.classList.add('active');
            });
        }
    
        const confirmWalletNameBtn = document.getElementById('confirmWalletName');
        if (confirmWalletNameBtn) {
            confirmWalletNameBtn.addEventListener('click', async () => {
                try {
                    const walletNameInput = document.getElementById('walletName');
                    window.pendingWalletName = walletNameInput.value.trim() || `Wallet ${wallets.length + 1}`;
                    
                    window.currentMnemonic = await BIP39.generateMnemonic();
                    
                    const wordGrid = document.createElement('div');
                    wordGrid.style.display = 'grid';
                    wordGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    wordGrid.style.gap = '10px';
                    wordGrid.style.margin = '20px 0';
    
                    window.currentMnemonic.forEach((word, index) => {
                        const wordElement = document.createElement('div');
                        wordElement.style.padding = '10px';
                        wordElement.style.border = '1px solid #ccc';
                        wordElement.style.borderRadius = '4px';
                        wordElement.textContent = `${index + 1}. ${word}`;
                        wordGrid.appendChild(wordElement);
                    });
    
                    const existingWordGrid = document.getElementById('wordGrid');
                    existingWordGrid.innerHTML = '';
                    existingWordGrid.appendChild(wordGrid);
    
                    createWalletNameScreen.classList.remove('active');
                    mnemonicScreen.classList.add('active');
                } catch (error) {
                    console.error('Error generating mnemonic:', error);
                }
            });
        }
    
        // Import Wallet Flow
        const importWalletBtn = document.getElementById('importWallet');
        if (importWalletBtn) {
            importWalletBtn.addEventListener('click', () => {
                createWalletScreen.classList.remove('active');
                importScreen.classList.add('active');
            });
        }
    
        // Back button for Create Wallet Name screen
        const backToOptionsBtn = document.getElementById('backToOptions');
        if (backToOptionsBtn) {
            backToOptionsBtn.addEventListener('click', () => {
                createWalletNameScreen.classList.remove('active');
                createWalletScreen.classList.add('active');
            });
        }
    
        // Back button for Import screen
        const backToImportOptionsBtn = document.getElementById('backToImportOptions');
        if (backToImportOptionsBtn) {
            backToImportOptionsBtn.addEventListener('click', () => {
                importScreen.classList.remove('active');
                createWalletScreen.classList.add('active');
                document.getElementById('importWalletName').value = '';
                document.getElementById('privateKey').value = '';
            });
        }
    
        const togglePrivateKeyBtn = document.getElementById('togglePrivateKey');
        if (togglePrivateKeyBtn) {
            togglePrivateKeyBtn.addEventListener('click', () => {
                const privateKeyInput = document.getElementById('privateKey');
                if (privateKeyInput.type === 'password') {
                    privateKeyInput.type = 'text';
                    togglePrivateKeyBtn.textContent = 'Hide';
                } else {
                    privateKeyInput.type = 'password';
                    togglePrivateKeyBtn.textContent = 'Show';
                }
            });
        }
    
        const confirmImportBtn = document.getElementById('confirmImport');
        if (confirmImportBtn) {
            confirmImportBtn.addEventListener('click', async () => {
                const privateKey = document.getElementById('privateKey').value.trim();
                const walletName = document.getElementById('importWalletName').value.trim() || 'Imported Wallet';
                const errorDiv = document.getElementById('importError');
    
                try {
                    if (!privateKey.match(/^[0-9a-fA-F]{64}$/)) {
                        throw new Error('Invalid private key format');
                    }
    
                    const web3 = new Web3();
                    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
                    
                    const { encryptionKey, salt } = await chrome.storage.local.get(['encryptionKey', 'salt']);
                    if (!encryptionKey || !salt) {
                        throw new Error('Encryption key not found');
                    }
    
                    const key = await crypto.subtle.importKey(
                        'raw',
                        new Uint8Array(encryptionKey),
                        { name: 'AES-GCM' },
                        false,
                        ['encrypt', 'decrypt']
                    );
    
                    const encryptedPrivateKey = await CryptoUtils.encrypt(privateKey, key);
    
                    const newWallet = {
                        name: walletName,
                        address: account.address,
                        encryptedPrivateKey: encryptedPrivateKey,
                        createdAt: new Date().toISOString()
                    };
    
                    const { wallets = [] } = await chrome.storage.local.get('wallets');
                    wallets.push(newWallet);
                    await chrome.storage.local.set({ wallets });
    
                    document.getElementById('privateKey').value = '';
                    
                    // Redirect to wallets screen after successful import
                    window.location.href = chrome.runtime.getURL('views/wallets.html');
    
                } catch (error) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
            });
        }
    
        // Mnemonic Verification Flow
        const mnemonicConfirmBtn = document.getElementById('mnemonicConfirm');
        if (mnemonicConfirmBtn) {
            mnemonicConfirmBtn.addEventListener('click', () => {
                setupVerification();
                mnemonicScreen.classList.remove('active');
                verificationScreen.classList.add('active');
            });
        }
    
        const verifyWordsBtn = document.getElementById('verifyWords');
        if (verifyWordsBtn) {
            verifyWordsBtn.addEventListener('click', async () => {
                const inputs = document.querySelectorAll('.word-verify');
                let allCorrect = true;
                
                inputs.forEach(input => {
                    const index = parseInt(input.dataset.index);
                    const inputValue = input.value.toLowerCase().trim();
                    const correctWord = window.currentMnemonic[index];
                    
                    if (inputValue !== correctWord) {
                        allCorrect = false;
                    }
                });
            
                if (!allCorrect) {
                    alert('Some words are incorrect. Please verify and try again.');
                    return;
                }
            
                try {
                    console.log('Creating new wallet...');
                    const web3 = new Web3();
                    // Generate a new account
                    const account = web3.eth.accounts.create();
                    console.log('Account created:', account); 
                    
                    // Get the encryption key
                    const { encryptionKey } = await chrome.storage.local.get('encryptionKey');
                    const key = await crypto.subtle.importKey(
                        'raw',
                        new Uint8Array(encryptionKey),
                        { name: 'AES-GCM' },
                        false,
                        ['encrypt', 'decrypt']
                    );
    
                    // Encrypt the private key
                    const encryptedPrivateKey = await CryptoUtils.encrypt(
                        account.privateKey.substring(2), // Remove '0x' prefix
                        key
                    );
    
                    const newWallet = {
                        name: window.pendingWalletName,
                        address: account.address,
                        encryptedPrivateKey: encryptedPrivateKey,
                        createdAt: new Date().toISOString()
                    };
    
                    const { wallets = [] } = await chrome.storage.local.get('wallets');
                    wallets.push(newWallet);
                    await chrome.storage.local.set({ wallets });
    
                    // Clear sensitive data
                    window.wordsToVerify = null;
                    window.currentMnemonic = null;
                    window.pendingWalletName = null;
                    
                    // Redirect to wallets screen after successful creation
                    window.location.href = chrome.runtime.getURL('views/wallets.html');
                    
                } catch (error) {
                    console.error('Error creating wallet:', error);
                }
            });
        }
    });
// Popup.js
// Utility Functions
async function getBalance(address) {
    try {
        const web3 = new Web3("https://aeneid.storyrpc.io/");
        const balanceWei = await web3.eth.getBalance(address);
        const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
        return balanceEth;
    } catch (error) {
        console.error('Error getting balance:', error);
        return '0.0';
    }
}

async function updateWalletsTable() {
    if (window.isUpdating) return;
    window.isUpdating = true;

    try {
        const { wallets = [] } = await chrome.storage.local.get('wallets');
        
        // Fetch all balances concurrently
        const walletsWithBalances = await Promise.all(
            wallets.map(async (wallet) => ({
                ...wallet,
                balance: await getBalance(wallet.address)
            }))
        );

        // Update table only after all balances are fetched
        const tbody = document.getElementById('walletsTableBody');
        tbody.innerHTML = '';
        
        for (const wallet of walletsWithBalances) {
            const row = document.createElement('tr');
            
            const truncateAddress = (address) => {
                if (!address) return '';
                return `${address.slice(0, 6)}...${address.slice(-4)}`;
            };
            
            row.innerHTML = `
                <td class="wallet-info">
                    <div class="wallet-name">${wallet.name}</div>
                    <div class="wallet-address-container">${truncateAddress(wallet.address)}</div>
                </td>
                <td class="balance-cell">${Number(wallet.balance).toFixed(2)} IP</td>
                <td class="actions-cell">
                    <button class="copy-btn" data-address="${wallet.address}">Copy</button>
                </td>
            `;
            
            // Make the entire row clickable except the copy button
            row.style.cursor = 'pointer';
            
            // Add click handler for the row
            row.addEventListener('click', (event) => {
                if (!event.target.closest('.copy-btn')) {
                    window.location.href = chrome.runtime.getURL('views/wallet-details.html') + `?address=${wallet.address}`;
                }
            });
            
            // Copy button handler
            const copyBtn = row.querySelector('.copy-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click when clicking the button
                navigator.clipboard.writeText(wallet.address)
                    .then(() => {
                        const toast = document.createElement('div');
                        toast.className = 'toast';
                        toast.textContent = 'Address copied to clipboard!';
                        document.body.appendChild(toast);
                        
                        setTimeout(() => toast.classList.add('visible'), 100);
                        setTimeout(() => {
                            toast.classList.remove('visible');
                            setTimeout(() => document.body.removeChild(toast), 300);
                        }, 2000);
                    })
                    .catch(err => console.error('Error copying address:', err));
            });

            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Error updating wallets table:', error);
    } finally {
        window.isUpdating = false;
    }
}

function startBalanceUpdates() {
    setInterval(async () => {
        if (document.getElementById('walletsScreen').classList.contains('active')) {
            await updateWalletsTable();
        }
    }, 10000);
}

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

    // Dynamic Content Loading
    async function loadContent(viewName) {
        try {
            const response = await fetch(`../views/${viewName}.html`);
            const html = await response.text();
            
            // Get the container and set the content
            const contentContainer = document.getElementById('dynamicContent');
            contentContainer.innerHTML = html;
            
            // Return a promise that resolves when the DOM is updated
            return new Promise(resolve => {
                // Use requestAnimationFrame to ensure the DOM is updated
                requestAnimationFrame(() => {
                    // Add another frame for good measure
                    requestAnimationFrame(() => {
                        resolve(true);
                    });
                });
            });
        } catch (error) {
            console.error(`Error loading ${viewName} content:`, error);
            return false;
        }
    }

// Tab Navigation Functions
function setupTabNavigation() {
    const walletsTab = document.getElementById('walletsTab');
    const trendsTab = document.getElementById('trendsTab');
    const ipTab = document.getElementById('ipTab');
    const swapTab = document.getElementById('swapTab');
    const contentContainer = document.getElementById('dynamicContent');
    
    // Only show tab navigation after password setup and when wallets exist
    const showTabs = async () => {
        const { hasPassword } = await chrome.storage.local.get('hasPassword');
        const { wallets = [] } = await chrome.storage.local.get('wallets');
        
        if (hasPassword && wallets.length > 0) {
            document.querySelector('.tab-navigation').style.display = 'flex';
        } else {
            document.querySelector('.tab-navigation').style.display = 'none';
        }
    };
    
    // Function to deactivate all tabs
    const deactivateAllTabs = () => {
        walletsTab.classList.remove('active');
        trendsTab.classList.remove('active');
        ipTab.classList.remove('active');
        swapTab.classList.remove('active');
    };
    
    // Function to hide all screens
    const hideAllScreens = () => {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    };
    
    // Switch to wallets screen
    walletsTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Show wallets screen
        document.getElementById('walletsScreen').classList.add('active');
        
        // Update tabs
        deactivateAllTabs();
        walletsTab.classList.add('active');
        
        // Refresh wallet data
        updateWalletsTable();
    });
    
    // Switch to trends screen
    trendsTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Show dynamic content screen first
        document.getElementById('dynamicContentScreen').classList.add('active');
        
        // Load trends content dynamically
        await loadContent('trends');
        
        // Wait a moment for DOM to update
        await new Promise(resolve => setTimeout(resolve, 300)); // Aumentado a 300ms para dar más tiempo
        
        // Asegurarse de que el script de trends se cargue correctamente
        if (!window.trendsScriptLoaded) {
            try {
                await window.loadScript('../scripts/views/trends.js');
                window.trendsScriptLoaded = true;
                console.log('Trends script loaded successfully');
            } catch (error) {
                console.error('Error loading trends script:', error);
            }
        }
        
        // Espera un poco más antes de inicializar
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Comprobar e inicializar trends
        if (window.initTrends && typeof window.initTrends === 'function') {
            console.log('Calling initTrends function');
            try {
                window.initTrends();
            } catch (error) {
                console.error('Error initializing trends:', error);
            }
        } else {
            console.error('initTrends function not found after loading script');
            
            // Alternativa: intentar inicializar manualmente si la función no está disponible
            try {
                console.log('Attempting manual initialization of trends');
                const customTokensList = document.getElementById('customTokensList');
                if (customTokensList) {
                    // Si el elemento existe, probablemente se cargó el HTML pero no se inicializó
                    const refreshButton = document.getElementById('refreshButton');
                    if (refreshButton) {
                        refreshButton.addEventListener('click', () => {
                            const lastUpdatedTime = document.getElementById('lastUpdatedTime');
                            if (lastUpdatedTime) {
                                const now = new Date();
                                lastUpdatedTime.textContent = `Last updated: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                            }
                        });
                    }
                }
            } catch (manualError) {
                console.error('Manual initialization failed:', manualError);
            }
        }
        
        // Update tabs
        deactivateAllTabs();
        trendsTab.classList.add('active');
    });
    
    // Switch to swap screen
    // Switch to swap screen
    swapTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Show dynamic content screen first
        document.getElementById('dynamicContentScreen').classList.add('active');

        // Load swap content
        const contentLoaded = await loadContent('swap');

        // Wait for a moment to ensure DOM is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Ensure the modal is now in the DOM
        const modal = document.getElementById('tokenSelectModal');
        if (!modal) {
            console.error("❌ Modal not found after swap content loaded!");
        } else {
            console.log("✅ Modal found after swap content loaded!");
            modal.style.display = 'none'; // Ensure it starts hidden
        }

        // Load and initialize the script
        if (!window.SwapModule) {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = '../scripts/views/swap.js';
                script.onload = function() {
                    if (window.initSwap && typeof window.initSwap === 'function') {
                        window.initSwap();
                        resolve();
                    }
                };
                document.body.appendChild(script);
            });
        } else {
            if (window.initSwap && typeof window.initSwap === 'function') {
                window.initSwap();
            }
        }

        // Update tabs
        deactivateAllTabs();
        swapTab.classList.add('active');
    });

    // Switch to IP screen
    // Switch to IP screen
    ipTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Show dynamic content screen
        document.getElementById('dynamicContentScreen').classList.add('active');
        
        // Load IP content dynamically
        await loadContent('ip');
        
        // Wait a moment for DOM to update
        await new Promise(resolve => setTimeout(resolve, 300)); 
        
        // Check if IP script is already loaded
        if (!window.ipScriptLoaded) {
            await window.loadScript('../scripts/views/ip.js');
            window.ipScriptLoaded = true;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!window.initIP || typeof window.initIP !== 'function') {
            console.warn('initIP not found immediately, waiting a bit longer...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Initialize IP-specific scripts
        if (window.initIP && typeof window.initIP === 'function') {
            window.initIP();
        } else {
            console.error('initIP function not found after loading script');

            try {
                const response = await fetch('../scripts/views/ip.js');
                const scriptContent = await response.text();
                eval(scriptContent); 
                
                if (window.initIP && typeof window.initIP === 'function') {
                    window.initIP();
                } else {
                    throw new Error('Still unable to find initIP function');
                }
            } catch (error) {
                console.error('Failed to initialize IP view:', error);
            }
        }
        
        // Update tabs
        deactivateAllTabs();
        ipTab.classList.add('active');
    });
    
    // Check if tabs should be shown
    showTabs();
}

// Main Event Listener
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize window variables
    window.currentMnemonic = window.currentMnemonic || null;
    window.wordsToVerify = window.wordsToVerify || null;
    window.isUpdating = false;
    window.pendingWalletName = window.pendingWalletName || null;

    // Initialize tab navigation
    document.querySelector('.tab-navigation').style.display = 'none';

    // Get all screen elements
    const setupScreen = document.getElementById('setupScreen');
    const createWalletScreen = document.getElementById('createWalletScreen');
    const createWalletNameScreen = document.getElementById('createWalletNameScreen');
    const mnemonicScreen = document.getElementById('mnemonicScreen');
    const verificationScreen = document.getElementById('verificationScreen');
    const walletsScreen = document.getElementById('walletsScreen');
    const importScreen = document.getElementById('importScreen');
    const dynamicContentScreen = document.getElementById('dynamicContentScreen');

    // Hide all screens initially
    [setupScreen, createWalletScreen, createWalletNameScreen, mnemonicScreen, 
     verificationScreen, walletsScreen, importScreen, dynamicContentScreen].forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    // Get stored state
    const { hasPassword } = await chrome.storage.local.get('hasPassword');
    const { wallets = [] } = await chrome.storage.local.get('wallets');

    // Show appropriate initial screen
    if (!hasPassword) {
        setupScreen.classList.add('active');
    } else if (wallets.length > 0) {
        walletsScreen.classList.add('active');
        await updateWalletsTable();
        startBalanceUpdates();
        // Initialize tab navigation
        setupTabNavigation();
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
                
                importScreen.classList.remove('active');
                walletsScreen.classList.add('active');
                await updateWalletsTable();
                
                // Setup tab navigation when wallets exist
                setupTabNavigation();

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

                await updateWalletsTable();

                verificationScreen.classList.remove('active');
                walletsScreen.classList.add('active');
                
                // Setup tab navigation when wallets exist
                setupTabNavigation();

                // Clear sensitive data
                window.wordsToVerify = null;
                window.currentMnemonic = null;
                window.pendingWalletName = null;
            } catch (error) {
                console.error('Error creating wallet:', error);
            }
        });
    }

   // Create Another Wallet Button
   const createAnotherWalletBtn = document.getElementById('createAnotherWallet');
   if (createAnotherWalletBtn) {
       createAnotherWalletBtn.addEventListener('click', () => {
           walletsScreen.classList.remove('active');
           createWalletScreen.classList.add('active');
       });
   }

   // Back to Create Wallet Screen Button
   const backToCreateWalletBtn = document.getElementById('backToCreateWallet');
   if (backToCreateWalletBtn) {
       backToCreateWalletBtn.addEventListener('click', () => {
           createWalletNameScreen.classList.remove('active');
           createWalletScreen.classList.add('active');
       });
   }

   // Start balance updates if showing wallet screen
   if (hasPassword && wallets.length > 0) {
       walletsScreen.classList.add('active');
       await updateWalletsTable();
       startBalanceUpdates();
       setupTabNavigation();
   }
   
   // Load scripts dynamically when needed
    window.loadScript = function(scriptPath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = false; 
            
            script.onload = () => {
                console.log(`Script loaded successfully: ${scriptPath}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`Failed to load script: ${scriptPath}`, error);
                reject(new Error(`Failed to load script: ${scriptPath}`));
            };
            
            document.body.appendChild(script);
        });
    };
});
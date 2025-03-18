// wallet-functions.js - Funciones específicas para la billetera

// Funciones de utilidad
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
        
        // Obtener todos los saldos de forma concurrente
        const walletsWithBalances = await Promise.all(
            wallets.map(async (wallet) => ({
                ...wallet,
                balance: await getBalance(wallet.address)
            }))
        );

        // Actualizar tabla solo después de obtener todos los saldos
        const tbody = document.getElementById('walletsTableBody');
        if (!tbody) {
            console.error('Error: walletsTableBody element not found');
            return;
        }
        
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
            
            // Hacer que toda la fila sea clickeable excepto el botón de copiar
            row.style.cursor = 'pointer';
            
            // Añadir manejador de eventos para la fila
            row.addEventListener('click', (event) => {
                if (!event.target.closest('.copy-btn')) {
                    window.location.href = chrome.runtime.getURL('views/wallet-details.html') + `?address=${wallet.address}`;
                }
            });
            
            // Manejador para el botón de copiar
            const copyBtn = row.querySelector('.copy-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevenir clic en la fila cuando se hace clic en el botón
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
        const walletsScreen = document.getElementById('walletsScreen');
        if (walletsScreen && walletsScreen.classList.contains('active')) {
            await updateWalletsTable();
        }
    }, 10000);
}

function copyAddress(address) {
    navigator.clipboard.writeText(address)
        .then(() => alert('Address copied to clipboard!'))
        .catch(err => console.error('Error copying address:', err));
}

// Funciones de configuración
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
    if (!verificationInputs) {
        console.error('Error: verificationInputs element not found');
        return;
    }
    
    verificationInputs.innerHTML = indices.map(index => `
        <div class="input-group">
            <label>Word #${index + 1}</label>
            <input type="text" data-index="${index}" class="word-verify">
        </div>
    `).join('');
}

// Event Listener para la inicialización de la billetera
document.addEventListener('DOMContentLoaded', async () => {
    // Manejador de configuración de contraseña
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

                const setupScreen = document.getElementById('setupScreen');
                const createWalletScreen = document.getElementById('createWalletScreen');
                
                if (setupScreen) setupScreen.classList.remove('active');
                if (createWalletScreen) createWalletScreen.classList.add('active');
            } catch (error) {
                console.error('Error during password setup:', error);
                passwordError.textContent = 'Error setting up password';
                passwordError.style.display = 'block';
            }
        });
    }

    // Flujo de creación de nueva billetera
    const createNewWalletBtn = document.getElementById('createNewWallet');
    if (createNewWalletBtn) {
        createNewWalletBtn.addEventListener('click', () => {
            const createWalletScreen = document.getElementById('createWalletScreen');
            const createWalletNameScreen = document.getElementById('createWalletNameScreen');
            
            if (createWalletScreen) createWalletScreen.classList.remove('active');
            if (createWalletNameScreen) createWalletNameScreen.classList.add('active');
        });
    }

    const confirmWalletNameBtn = document.getElementById('confirmWalletName');
    if (confirmWalletNameBtn) {
        confirmWalletNameBtn.addEventListener('click', async () => {
            try {
                const { wallets = [] } = await chrome.storage.local.get('wallets');
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
                if (existingWordGrid) {
                    existingWordGrid.innerHTML = '';
                    existingWordGrid.appendChild(wordGrid);
                }

                const createWalletNameScreen = document.getElementById('createWalletNameScreen');
                const mnemonicScreen = document.getElementById('mnemonicScreen');
                
                if (createWalletNameScreen) createWalletNameScreen.classList.remove('active');
                if (mnemonicScreen) mnemonicScreen.classList.add('active');
            } catch (error) {
                console.error('Error generating mnemonic:', error);
            }
        });
    }

    // Flujo de importación de billetera
    const importWalletBtn = document.getElementById('importWallet');
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', () => {
            const createWalletScreen = document.getElementById('createWalletScreen');
            const importScreen = document.getElementById('importScreen');
            
            if (createWalletScreen) createWalletScreen.classList.remove('active');
            if (importScreen) importScreen.classList.add('active');
        });
    }

    // Botón de regreso para la pantalla de nombre de billetera
    const backToOptionsBtn = document.getElementById('backToOptions');
    if (backToOptionsBtn) {
        backToOptionsBtn.addEventListener('click', () => {
            const createWalletNameScreen = document.getElementById('createWalletNameScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (createWalletNameScreen) createWalletNameScreen.classList.remove('active');
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }

    // Botón de regreso para la pantalla de importación
    const backToImportOptionsBtn = document.getElementById('backToImportOptions');
    if (backToImportOptionsBtn) {
        backToImportOptionsBtn.addEventListener('click', () => {
            const importScreen = document.getElementById('importScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (importScreen) {
                importScreen.classList.remove('active');
                const importWalletNameInput = document.getElementById('importWalletName');
                const privateKeyInput = document.getElementById('privateKey');
                if (importWalletNameInput) importWalletNameInput.value = '';
                if (privateKeyInput) privateKeyInput.value = '';
            }
            
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }

    // Para el botón de alternar visibilidad de clave privada
    const togglePrivateKeyBtn = document.getElementById('togglePrivateKey');
    if (togglePrivateKeyBtn) {
        togglePrivateKeyBtn.addEventListener('click', () => {
            const privateKeyInput = document.getElementById('privateKey');
            if (privateKeyInput) {
                if (privateKeyInput.type === 'password') {
                    privateKeyInput.type = 'text';
                    togglePrivateKeyBtn.textContent = 'Hide';
                } else {
                    privateKeyInput.type = 'password';
                    togglePrivateKeyBtn.textContent = 'Show';
                }
            }
        });
    }
    
    // Para el botón de confirmar importación
    const confirmImportBtn = document.getElementById('confirmImport');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', async () => {
            const privateKeyInput = document.getElementById('privateKey');
            const importWalletNameInput = document.getElementById('importWalletName');
            const errorDiv = document.getElementById('importError');
            
            if (!privateKeyInput || !errorDiv) {
                console.error('Required elements not found for import');
                return;
            }
            
            const privateKey = privateKeyInput.value.trim();
            const walletName = importWalletNameInput ? 
                importWalletNameInput.value.trim() || 'Imported Wallet' : 
                'Imported Wallet';

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

                if (privateKeyInput) privateKeyInput.value = '';
                
                const importScreen = document.getElementById('importScreen');
                const walletsScreen = document.getElementById('walletsScreen');
                
                if (importScreen) importScreen.classList.remove('active');
                if (walletsScreen) {
                    walletsScreen.classList.add('active');
                    await updateWalletsTable();
                }
                
                // Configurar navegación por pestañas cuando existen billeteras
                if (typeof window.setupTabNavigation === 'function') {
                    window.setupTabNavigation();
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }
    
    // Para el botón Mnemonic Confirm
    const mnemonicConfirmBtn = document.getElementById('mnemonicConfirm');
    if (mnemonicConfirmBtn) {
        mnemonicConfirmBtn.addEventListener('click', () => {
            setupVerification();
            const mnemonicScreen = document.getElementById('mnemonicScreen');
            const verificationScreen = document.getElementById('verificationScreen');
            
            if (mnemonicScreen) mnemonicScreen.classList.remove('active');
            if (verificationScreen) verificationScreen.classList.add('active');
        });
    }
    
    // Para el botón Verify Words
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

                const verificationScreen = document.getElementById('verificationScreen');
                const walletsScreen = document.getElementById('walletsScreen');
                
                if (verificationScreen) verificationScreen.classList.remove('active');
                if (walletsScreen) walletsScreen.classList.add('active');
                
                // Setup tab navigation when wallets exist
                if (typeof window.setupTabNavigation === 'function') {
                    window.setupTabNavigation();
                }

                // Clear sensitive data
                window.wordsToVerify = null;
                window.currentMnemonic = null;
                window.pendingWalletName = null;
            } catch (error) {
                console.error('Error creating wallet:', error);
            }
        });
    }
    
    // Para el botón "Create Another Wallet"
    const createAnotherWalletBtn = document.getElementById('createAnotherWallet');
    if (createAnotherWalletBtn) {
        createAnotherWalletBtn.addEventListener('click', () => {
            const walletsScreen = document.getElementById('walletsScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (walletsScreen) walletsScreen.classList.remove('active');
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }
    
    // Para el botón "Back to Create Wallet"
    const backToCreateWalletBtn = document.getElementById('backToCreateWallet');
    if (backToCreateWalletBtn) {
        backToCreateWalletBtn.addEventListener('click', () => {
            const createWalletNameScreen = document.getElementById('createWalletNameScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (createWalletNameScreen) createWalletNameScreen.classList.remove('active');
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }
});

// Exportar funciones para hacerlas disponibles globalmente
window.updateWalletsTable = updateWalletsTable;
window.startBalanceUpdates = startBalanceUpdates;
window.getBalance = getBalance;
window.copyAddress = copyAddress;
window.setupVerification = setupVerification;
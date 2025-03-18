// Wallet Functions - Funciones específicas para la billetera
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

// Password Setup Handler
document.addEventListener('DOMContentLoaded', async () => {
    // Los event listeners específicos para la wallet
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

    // Create New Wallet Flow
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
                existingWordGrid.innerHTML = '';
                existingWordGrid.appendChild(wordGrid);

                const createWalletNameScreen = document.getElementById('createWalletNameScreen');
                const mnemonicScreen = document.getElementById('mnemonicScreen');
                
                if (createWalletNameScreen) createWalletNameScreen.classList.remove('active');
                if (mnemonicScreen) mnemonicScreen.classList.add('active');
            } catch (error) {
                console.error('Error generating mnemonic:', error);
            }
        });
    }

    // Import Wallet Flow
    const importWalletBtn = document.getElementById('importWallet');
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', () => {
            const createWalletScreen = document.getElementById('createWalletScreen');
            const importScreen = document.getElementById('importScreen');
            
            if (createWalletScreen) createWalletScreen.classList.remove('active');
            if (importScreen) importScreen.classList.add('active');
        });
    }

    // Back button for Create Wallet Name screen
    const backToOptionsBtn = document.getElementById('backToOptions');
    if (backToOptionsBtn) {
        backToOptionsBtn.addEventListener('click', () => {
            const createWalletNameScreen = document.getElementById('createWalletNameScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (createWalletNameScreen) createWalletNameScreen.classList.remove('active');
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }

    // ... (resto de los event listeners de wallet)
    
    // Los siguientes botones se configuran de manera similar a los anteriores
    
    // Para el botón Toggle Private Key
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
    
    // Para el botón Confirm Import
    const confirmImportBtn = document.getElementById('confirmImport');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', async () => {
            // Código para importar wallet (omitido por brevedad)
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
            // Código para verificar palabras de la mnemónica (omitido por brevedad)
        });
    }
    
    // Para el botón Create Another Wallet
    const createAnotherWalletBtn = document.getElementById('createAnotherWallet');
    if (createAnotherWalletBtn) {
        createAnotherWalletBtn.addEventListener('click', () => {
            const walletsScreen = document.getElementById('walletsScreen');
            const createWalletScreen = document.getElementById('createWalletScreen');
            
            if (walletsScreen) walletsScreen.classList.remove('active');
            if (createWalletScreen) createWalletScreen.classList.add('active');
        });
    }
    
    // Para el botón Back to Create Wallet
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
// Wallet Selector Functionality
const WalletSelector = {
    // Store references to DOM elements
    elements: {
        currentWallet: null,
        currentWalletName: null,
        currentWalletAddress: null,
        walletListModal: null,
        walletList: null,
        closeModalBtn: null,
        walletSearch: null,
        addWalletBtn: null
    },
    
    // Store current wallet data
    currentWalletData: null,
    
    // Store all wallets data
    walletsData: [],
    
    // Initialize the wallet selector
    init: async function() {
        console.log('Initializing Wallet Selector');
        
        // Get DOM elements
        this.elements.currentWallet = document.getElementById('currentWalletDisplay');
        this.elements.currentWalletName = document.getElementById('currentWalletName');
        this.elements.currentWalletAddress = document.getElementById('currentWalletAddress');
        this.elements.walletListModal = document.getElementById('walletListModal');
        this.elements.walletList = document.getElementById('walletList');
        this.elements.closeModalBtn = document.getElementById('closeWalletList');
        this.elements.walletSearch = document.getElementById('walletSearch');
        this.elements.addWalletBtn = document.getElementById('addWalletBtn');
        
        // Check if all elements are found
        const allElementsFound = Object.values(this.elements).every(el => el !== null);
        if (!allElementsFound) {
            console.error('Some wallet selector elements were not found in the DOM');
            return false;
        }
        
        // Fetch wallets from storage
        await this.loadWallets();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update current wallet display
        this.updateCurrentWalletDisplay();
        
        return true;
    },
    
    // Load wallets from Chrome storage
    loadWallets: async function() {
        try {
            const { wallets = [] } = await chrome.storage.local.get('wallets');
            this.walletsData = wallets;
            
            // Get active wallet from storage or use first wallet
            const { activeWallet } = await chrome.storage.local.get('activeWallet');
            
            if (activeWallet) {
                this.currentWalletData = this.walletsData.find(w => 
                    w.address.toLowerCase() === activeWallet.toLowerCase()
                );
            }
            
            // If no active wallet set or not found, use the first one
            if (!this.currentWalletData && this.walletsData.length > 0) {
                this.currentWalletData = this.walletsData[0];
                // Save as active wallet
                chrome.storage.local.set({ activeWallet: this.currentWalletData.address });
            }
            
            // Update window.ACTIVE_WALLET for compatibility with existing code
            if (this.currentWalletData) {
                window.ACTIVE_WALLET = this.currentWalletData.address;
            }
            
            // Populate wallet list
            this.renderWalletList();
            
            return true;
        } catch (error) {
            console.error('Error loading wallets:', error);
            return false;
        }
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Click on current wallet display to open the wallet list modal
        this.elements.currentWallet.addEventListener('click', () => {
            this.openWalletListModal();
        });
        
        // Click on close button to close the wallet list modal
        this.elements.closeModalBtn.addEventListener('click', () => {
            this.closeWalletListModal();
        });
        
        // Click outside the wallet list container to close the modal
        this.elements.walletListModal.addEventListener('click', (event) => {
            if (event.target === this.elements.walletListModal) {
                this.closeWalletListModal();
            }
        });
        
        // Search input for filtering wallets
        this.elements.walletSearch.addEventListener('input', () => {
            this.filterWalletList();
        });
        
        // Add wallet button
        this.elements.addWalletBtn.addEventListener('click', () => {
            this.closeWalletListModal();
            // Redirect to create wallet screen or show create wallet modal
            this.showCreateWalletScreen();
        });
    },
    
    // Render the wallet list
    renderWalletList: async function() {
        if (!this.elements.walletList) return;
        
        // Clear the wallet list
        this.elements.walletList.innerHTML = '';
        
        // Fetch balances for all wallets
        const walletsWithBalances = await this.getWalletsWithBalances();
        
        // Add each wallet to the list
        walletsWithBalances.forEach((wallet, index) => {
            const walletItem = document.createElement('div');
            walletItem.className = 'wallet-item';
            if (this.currentWalletData && wallet.address === this.currentWalletData.address) {
                walletItem.classList.add('active');
            }
            
            // Get a consistent color for the wallet based on its address
            const colorClass = `color${(index % 5) + 1}`;
            
            // Truncate address for display
            const shortAddress = this.truncateAddress(wallet.address);
            
            walletItem.innerHTML = `
                <div class="wallet-item-icon ${colorClass}"></div>
                <div class="wallet-item-details">
                    <div class="wallet-item-name">${wallet.name || 'My Wallet'}</div>
                    <div class="wallet-item-address">${shortAddress}</div>
                </div>
                <div class="wallet-item-balance-container">
                    <div class="wallet-item-balance">$0.00 USD</div>
                    <div class="wallet-item-balance-ip">${wallet.balance || '0'} IP</div>
                </div>
            `;
            
            // Add click event to select this wallet
            walletItem.addEventListener('click', () => {
                this.selectWallet(wallet);
            });
            
            this.elements.walletList.appendChild(walletItem);
        });
    },
    
    // Get all wallets with their balances
    getWalletsWithBalances: async function() {
        try {
            return await Promise.all(this.walletsData.map(async (wallet) => {
                try {
                    const balance = await this.getBalance(wallet.address);
                    return {
                        ...wallet,
                        balance
                    };
                } catch (error) {
                    console.error(`Error getting balance for wallet ${wallet.address}:`, error);
                    return {
                        ...wallet,
                        balance: '0'
                    };
                }
            }));
        } catch (error) {
            console.error('Error getting wallets with balances:', error);
            return this.walletsData;
        }
    },
    
    // Helper function to get balance for an address
    getBalance: async function(address) {
        try {
            const web3 = new Web3("https://aeneid.storyrpc.io/");
            const balanceWei = await web3.eth.getBalance(address);
            const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
            return parseFloat(balanceEth).toFixed(4);
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    },
    
    // Update the current wallet display
    updateCurrentWalletDisplay: function() {
        if (!this.currentWalletData || !this.elements.currentWalletName || !this.elements.currentWalletAddress) {
            return;
        }
        
        this.elements.currentWalletName.textContent = this.currentWalletData.name || 'My Wallet';
        this.elements.currentWalletAddress.textContent = this.truncateAddress(this.currentWalletData.address);
    },
    
    // Select a wallet
    selectWallet: async function(wallet) {
        this.currentWalletData = wallet;
        
        // Update the global active wallet
        window.ACTIVE_WALLET = wallet.address;
        
        // Save the active wallet to storage
        await chrome.storage.local.set({ activeWallet: wallet.address });
        
        // Update the display
        this.updateCurrentWalletDisplay();
        
        // Refresh the content based on the selected wallet
        if (typeof window.updateWalletsTable === 'function') {
            window.updateWalletsTable();
        }
        
        // Close the modal
        this.closeWalletListModal();
        
        // Re-render the wallet list to update the active wallet
        this.renderWalletList();
        
        // Refresh any wallet-dependent content
        if (window.WalletDetailsModule && typeof window.WalletDetailsModule.refresh === 'function') {
            window.WalletDetailsModule.refresh();
        }
    },
    
    // Filter the wallet list based on search input
    filterWalletList: function() {
        const searchTerm = this.elements.walletSearch.value.toLowerCase();
        const walletItems = this.elements.walletList.querySelectorAll('.wallet-item');
        
        walletItems.forEach(item => {
            const name = item.querySelector('.wallet-item-name').textContent.toLowerCase();
            const address = item.querySelector('.wallet-item-address').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || address.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },
    
    // Open the wallet list modal
    openWalletListModal: function() {
        this.elements.walletListModal.style.display = 'block';
        this.elements.walletSearch.value = ''; // Clear search input
        this.filterWalletList(); // Reset filtered results
        
        // Refresh wallet list in case new wallets were added
        this.loadWallets();
    },
    
    // Close the wallet list modal
    closeWalletListModal: function() {
        this.elements.walletListModal.style.display = 'none';
    },
    
    // Show create wallet screen
    showCreateWalletScreen: function() {
        // Check if we're in popup.html context
        const createWalletScreen = document.getElementById('createWalletScreen');
        if (createWalletScreen) {
            // Hide all screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Show create wallet screen
            createWalletScreen.classList.add('active');
        } else {
            // Navigate back to main page
            window.location.href = '../views/popup.html';
        }
    },
    
    // Helper function to truncate address
    truncateAddress: function(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
};

// Initialize the wallet selector when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize if the wallet selector container exists
    const walletSelectorContainer = document.querySelector('.wallet-selector-container');
    if (walletSelectorContainer) {
        await WalletSelector.init();
    }
});
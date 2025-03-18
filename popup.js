// Popup.js

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
    const walletTab = document.getElementById('walletTab');
    const trendsTab = document.getElementById('trendsTab');
    const ipTab = document.getElementById('ipTab');
    const swapTab = document.getElementById('swapTab');
    const loanTab = document.getElementById('loanTab');
    
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
        walletTab.classList.remove('active');
        trendsTab.classList.remove('active');
        ipTab.classList.remove('active');
        swapTab.classList.remove('active');
        loanTab.classList.remove('active');
    };
    
    // Function to hide all screens
    const hideAllScreens = () => {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    };
    
    // Switch to wallets screen
    walletTab.addEventListener('click', async () => {
        hideAllScreens();
        
        console.log("TAB")
        // Show dynamic content screen first
        document.getElementById('dynamicContentScreen').classList.add('active');

        // Load wallet content dynamically
        await loadContent('wallet-details');

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Asegurarse de que el script de trends se cargue correctamente
        if (!window.walletScriptLoaded) {
            try {
                await window.loadScript('../scripts/views/wallet-details.js');
                window.walletScriptLoaded = true;
                console.log('Wallet script loaded successfully');
            } catch (error) {
                console.error('Error loading Wallet script:', error);
            }
        }

        //  Ensure WalletDetailsModule is re-initialized every time tab is clicked
        if (window.initWalletDetailsModule) {
            console.log("Re-initializing WalletDetailsModule...");
            window.initWalletDetailsModule();
        } else {
            console.error("⚠️ initWalletDetailsModule is not defined.");
        }
        
        // Update tabs
        deactivateAllTabs();
        walletTab.classList.add('active');
    
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

    loanTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Show dynamic content screen first
        document.getElementById('dynamicContentScreen').classList.add('active');

        // Load loan content
        await loadContent('loan');

        // Wait for a moment to ensure DOM is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load and initialize the script
        if (!window.loanModule) {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = '../scripts/views/loan.js';
                script.onload = function() {
                    if (window.initLoan && typeof window.initLoan === 'function') {
                        window.initLoan();
                        resolve();
                    }
                };
                document.body.appendChild(script);
            });
        } else {
            if (window.initLoan && typeof window.initLoan === 'function') {
                window.initLoan();
            }
        }

        // Update tabs
        deactivateAllTabs();
        loanTab.classList.add('active');
    });

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
    console.log("LOADED")
    // Initialize window variables
    window.currentMnemonic = window.currentMnemonic || null;
    window.wordsToVerify = window.wordsToVerify || null;
    window.isUpdating = false;
    window.pendingWalletName = window.pendingWalletName || null;

    // Initialize tab navigation
    document.querySelector('.tab-navigation').style.display = 'none';

    // Get all screen elements
    const dynamicContentScreen = document.getElementById('dynamicContentScreen');

    // Get stored state
    const { hasPassword } = await chrome.storage.local.get('hasPassword');
    const { wallets = [] } = await chrome.storage.local.get('wallets');
    
    if (wallets.length > 0) {
        window.ACTIVE_WALLET = wallets[0]["address"];
    }

    // Show appropriate initial screen
    if (!hasPassword) {
        setupScreen.classList.add('active');
    } else if (wallets.length > 0) {
        dynamicContentScreen.classList.add('active');
        
        // Load wallet content at startup
        await loadContent('wallet-details');
    
        // Ensure wallet script is loaded
        if (!window.walletScriptLoaded) {
            try {
                await window.loadScript('../scripts/views/wallet-details.js');
                window.walletScriptLoaded = true;
                console.log('Wallet script loaded successfully at startup');
            } catch (error) {
                console.error('Error loading Wallet script at startup:', error);
            }
        }
    
        // Initialize tab navigation
        setupTabNavigation();
    }else {
        createWalletScreen.classList.add('active');
    }
   
   
});
// Popup.js - Archivo principal de navegación

// Cargar scripts dinámicamente cuando se necesiten
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

// Cargar contenido dinámicamente
async function loadContent(viewName) {
    try {
        const response = await fetch(`../views/${viewName}.html`);
        const html = await response.text();
        
        // Obtener el contenedor y establecer el contenido
        const contentContainer = document.getElementById('dynamicContent');
        contentContainer.innerHTML = html;
        
        // Devolver una promesa que se resuelve cuando el DOM se actualiza
        return new Promise(resolve => {
            // Usar requestAnimationFrame para asegurar que el DOM se actualiza
            requestAnimationFrame(() => {
                // Añadir otro frame para mayor seguridad
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

// Función de navegación por pestañas
function setupTabNavigation() {
    const walletTab = document.getElementById('walletTab');
    const trendsTab = document.getElementById('trendsTab');
    const ipTab = document.getElementById('ipTab');
    const swapTab = document.getElementById('swapTab');
    const loanTab = document.getElementById('loanTab');
    
    // Solo mostrar navegación por pestañas después de configurar la contraseña y cuando existen billeteras
    const showTabs = async () => {
        const { hasPassword } = await chrome.storage.local.get('hasPassword');
        const { wallets = [] } = await chrome.storage.local.get('wallets');
        
        if (hasPassword && wallets.length > 0) {
            document.querySelector('.tab-navigation').style.display = 'flex';
        } else {
            document.querySelector('.tab-navigation').style.display = 'none';
        }
    };
    
    // Función para desactivar todas las pestañas
    const deactivateAllTabs = () => {
        walletTab.classList.remove('active');
        trendsTab.classList.remove('active');
        ipTab.classList.remove('active');
        swapTab.classList.remove('active');
        loanTab.classList.remove('active');
    };
    
    // Función para ocultar todas las pantallas
    const hideAllScreens = () => {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    };
    
    // Cambiar a la pantalla de billeteras
    walletTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Verificar si existe walletsScreen (enfoque de pantalla directa)
        const walletsScreen = document.getElementById('walletsScreen');
        if (walletsScreen) {
            walletsScreen.classList.add('active');
            // Actualizar datos de la billetera si la función existe
            if (typeof window.updateWalletsTable === 'function') {
                window.updateWalletsTable();
            }
        } else {
            // Alternativa: usar enfoque de contenido dinámico
            console.log("Using dynamic content approach for wallet");
            document.getElementById('dynamicContentScreen').classList.add('active');
            
            // Cargar contenido de billetera dinámicamente
            await loadContent('wallet-details');
            
            // Esperar a que el DOM se actualice
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Asegurarse de que el script de la billetera está cargado
            if (!window.walletScriptLoaded) {
                try {
                    await window.loadScript('../scripts/views/wallet-details.js');
                    window.walletScriptLoaded = true;
                    console.log('Wallet script loaded successfully');
                } catch (error) {
                    console.error('Error loading Wallet script:', error);
                }
            }
            
            // Reinicializar WalletDetailsModule si existe
            if (window.initWalletDetailsModule) {
                console.log("Re-initializing WalletDetailsModule...");
                window.initWalletDetailsModule();
            }
        }
        
        // Actualizar pestañas
        deactivateAllTabs();
        walletTab.classList.add('active');
    });
    
    // Cambiar a la pantalla de tendencias
    trendsTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Mostrar primero la pantalla de contenido dinámico
        document.getElementById('dynamicContentScreen').classList.add('active');
        
        // Cargar contenido de tendencias dinámicamente
        await loadContent('trends');
        
        // Esperar un momento para que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 300)); 
        
        // Asegurarse de que el script de tendencias se cargue correctamente
        if (!window.trendsScriptLoaded) {
            try {
                await window.loadScript('../scripts/views/trends.js');
                window.trendsScriptLoaded = true;
                console.log('Trends script loaded successfully');
            } catch (error) {
                console.error('Error loading trends script:', error);
            }
        }
        
        // Esperar un poco más antes de inicializar
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Comprobar e inicializar tendencias
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
        
        // Actualizar pestañas
        deactivateAllTabs();
        trendsTab.classList.add('active');
    });
    
    // Cambiar a la pantalla de swap
    swapTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Mostrar primero la pantalla de contenido dinámico
        document.getElementById('dynamicContentScreen').classList.add('active');

        // Cargar contenido de swap
        const contentLoaded = await loadContent('swap');

        // Esperar un momento para asegurar que el DOM se actualiza
        await new Promise(resolve => setTimeout(resolve, 100));

        // Asegurarse de que el modal ahora está en el DOM
        const modal = document.getElementById('tokenSelectModal');
        if (!modal) {
            console.error("❌ Modal not found after swap content loaded!");
        } else {
            console.log("✅ Modal found after swap content loaded!");
            modal.style.display = 'none'; // Asegurarse de que comienza oculto
        }

        // Cargar e inicializar el script
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

        // Actualizar pestañas
        deactivateAllTabs();
        swapTab.classList.add('active');
    });

    // Cambiar a la pantalla de préstamos
    loanTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Mostrar primero la pantalla de contenido dinámico
        document.getElementById('dynamicContentScreen').classList.add('active');

        // Cargar contenido de préstamos
        await loadContent('loan');

        // Esperar un momento para asegurar que el DOM se actualiza
        await new Promise(resolve => setTimeout(resolve, 100));

        // Cargar e inicializar el script
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

        // Actualizar pestañas
        deactivateAllTabs();
        loanTab.classList.add('active');
    });

    // Cambiar a la pantalla de IP
    ipTab.addEventListener('click', async () => {
        hideAllScreens();
        
        // Mostrar pantalla de contenido dinámico
        document.getElementById('dynamicContentScreen').classList.add('active');
        
        // Cargar contenido de IP dinámicamente
        await loadContent('ip');
        
        // Esperar un momento para que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 300)); 
        
        // Verificar si el script de IP ya está cargado
        if (!window.ipScriptLoaded) {
            await window.loadScript('../scripts/views/ip.js');
            window.ipScriptLoaded = true;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!window.initIP || typeof window.initIP !== 'function') {
            console.warn('initIP not found immediately, waiting a bit longer...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Inicializar scripts específicos de IP
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
        
        // Actualizar pestañas
        deactivateAllTabs();
        ipTab.classList.add('active');
    });
    
    // Verificar si se deben mostrar las pestañas
    showTabs();
}

// Event Listener principal
document.addEventListener('DOMContentLoaded', async () => {
    console.log("LOADED")
    // Inicializar variables de window
    window.currentMnemonic = window.currentMnemonic || null;
    window.wordsToVerify = window.wordsToVerify || null;
    window.isUpdating = false;
    window.pendingWalletName = window.pendingWalletName || null;

    // Inicializar navegación por pestañas
    document.querySelector('.tab-navigation').style.display = 'none';

    // Obtener todos los elementos de pantalla
    const setupScreen = document.getElementById('setupScreen');
    const createWalletScreen = document.getElementById('createWalletScreen');
    const createWalletNameScreen = document.getElementById('createWalletNameScreen');
    const mnemonicScreen = document.getElementById('mnemonicScreen');
    const verificationScreen = document.getElementById('verificationScreen');
    const walletsScreen = document.getElementById('walletsScreen');
    const importScreen = document.getElementById('importScreen');
    const dynamicContentScreen = document.getElementById('dynamicContentScreen');

    // Ocultar todas las pantallas inicialmente si existen
    [setupScreen, createWalletScreen, createWalletNameScreen, mnemonicScreen, 
     verificationScreen, walletsScreen, importScreen, dynamicContentScreen].forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    // Obtener estado almacenado
    const { hasPassword } = await chrome.storage.local.get('hasPassword');
    const { wallets = [] } = await chrome.storage.local.get('wallets');
    
    // Verificar si hay billeteras disponibles antes de asignar la activa
    if (wallets.length > 0) {
        window.ACTIVE_WALLET = wallets[0]["address"];
    }

    // Mostrar la pantalla inicial apropiada
    if (!hasPassword) {
        // Verificar si setupScreen existe antes de añadir la clase
        if (setupScreen) {
            setupScreen.classList.add('active');
        } else {
            console.error('Error: setupScreen element not found in the DOM');
            // Alternativa: cargar la pantalla de configuración
            await loadContent('setup');
            if (dynamicContentScreen) {
                dynamicContentScreen.classList.add('active');
            }
        }
    } else if (wallets.length > 0) {
        // Verificar si estamos usando pantallas directas o contenido dinámico
        if (walletsScreen) {
            walletsScreen.classList.add('active');
            if (typeof window.updateWalletsTable === 'function') {
                await window.updateWalletsTable();
                if (typeof window.startBalanceUpdates === 'function') {
                    window.startBalanceUpdates();
                }
            }
        } else if (dynamicContentScreen) {
            dynamicContentScreen.classList.add('active');
            await loadContent('wallet-details');
            
            // Asegurarse de que el script de la billetera está cargado
            if (!window.walletScriptLoaded) {
                try {
                    await window.loadScript('../scripts/views/wallet-details.js');
                    window.walletScriptLoaded = true;
                    console.log('Wallet script loaded successfully at startup');
                } catch (error) {
                    console.error('Error loading Wallet script at startup:', error);
                }
            }
        }
        
        // Inicializar navegación por pestañas
        setupTabNavigation();
    } else {
        // Verificar si createWalletScreen existe antes de añadir la clase
        if (createWalletScreen) {
            createWalletScreen.classList.add('active');
        } else {
            console.error('Error: createWalletScreen element not found in the DOM');
            // Alternativa: cargar la pantalla de creación de billetera dinámicamente
            await loadContent('create-wallet');
            if (dynamicContentScreen) {
                dynamicContentScreen.classList.add('active');
            }
        }
    }
});
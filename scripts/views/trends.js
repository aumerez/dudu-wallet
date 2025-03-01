// Este es el archivo trends.js

// Function to format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    
    if (amount >= 1) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } else {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(amount);
    }
}

// Function to format last updated time
function formatLastUpdated() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `Last updated: ${hours}:${minutes}`;
}

// Función principal de inicialización de trends
window.initTrends = function() {
    console.log('initTrends ejecutado');
    
    // Obtener el contenedor (o crearlo si no existe)
    let customTokensList = document.getElementById('customTokensList');
    if (!customTokensList) {
        console.log('Creando elemento customTokensList');
        customTokensList = document.createElement('div');
        customTokensList.id = 'customTokensList';
        customTokensList.className = 'trends-list';
        
        // Insertarlo en el DOM
        const container = document.querySelector('.trends-container');
        if (container) {
            container.insertBefore(customTokensList, document.querySelector('.last-updated'));
        } else {
            console.error('No se encontró el contenedor principal');
            return;
        }
    }
    
    // Limpiar contenedor
    customTokensList.innerHTML = '';
    
    // Datos de los tokens
    const tokens = [
        {
            name: "Sona",
            symbol: "SONA",
            price_usd: 0.48,
            price_change_percentage: 5.2,
            logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/22761.png"
        },
        {
            name: "WTF Token",
            symbol: "WTF",
            price_usd: 0.0076,
            price_change_percentage: -2.7,
            logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/21821.png"
        },
        {
            name: "Ippy",
            symbol: "IPPY",
            price_usd: 0.025,
            price_change_percentage: 12.4,
            logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/28538.png"
        },
        {
            name: "Crunch",
            symbol: "CRUNCH",
            price_usd: 0.00134,
            price_change_percentage: -1.8,
            logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/24876.png"
        },
        {
            name: "PIPE",
            symbol: "PIPE",
            price_usd: 0.0394,
            price_change_percentage: 7.6,
            logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/25101.png"
        }
    ];
    
    // Renderizar cada token
    tokens.forEach(token => {
        const tokenItem = document.createElement('div');
        tokenItem.className = 'trend-item';
        
        const changeClass = token.price_change_percentage >= 0 ? 'positive-change' : 'negative-change';
        const sign = token.price_change_percentage >= 0 ? '+' : '';
        
        tokenItem.innerHTML = `
            <div class="trend-item-left">
                <div class="coin-logo" style="background-image: url('${token.logoUrl}')"></div>
                <div class="coin-info">
                    <div class="coin-name">${token.name}</div>
                    <div class="coin-symbol">${token.symbol}</div>
                </div>
            </div>
            <div class="trend-item-right">
                <div class="coin-price">${formatCurrency(token.price_usd)}</div>
                <div class="coin-change ${changeClass}">${sign}${token.price_change_percentage.toFixed(2)}%</div>
            </div>
        `;
        
        customTokensList.appendChild(tokenItem);
    });
    
    // Actualizar timestamp
    document.getElementById('lastUpdatedTime').textContent = formatLastUpdated();
    
    // Agregar listener al botón de refresh
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log("Refresh button clicked");
            document.getElementById('lastUpdatedTime').textContent = formatLastUpdated();
        });
    }
};

// Ejecutar la inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded en trends.js');
    
    // Ejecutar initTrends si no ha sido llamado desde fuera
    if (typeof window.initTrendsCalled === 'undefined') {
        window.initTrendsCalled = true;
        window.initTrends();
    }
});
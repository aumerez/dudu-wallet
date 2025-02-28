// trends.js
// API endpoint for trending memecoins
const TRENDING_API_URL = "https://api.coingecko.com/api/v3/search/trending";

// Cache duration in minutes
const CACHE_DURATION = 5;

// Function to format currency
function formatCurrency(amount) {
    // Format as USD with 2 decimal places for values >= 1
    // For smaller values, use more decimal places
    if (amount >= 1) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } else {
        // Use more decimal places for small values
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(amount);
    }
}

// Function to format percentage change
function formatPercentage(change) {
    const value = parseFloat(change);
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Function to format last updated time
function formatLastUpdated() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `Last updated: ${hours}:${minutes}`;
}

// Function to show loading state
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('trendsList').style.display = 'none';
}

// Function to show error state
function showError() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'flex';
    document.getElementById('trendsList').style.display = 'none';
}

// Function to show trends data
function showTrends() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('trendsList').style.display = 'block';
}

// Function to fetch trending memecoins
async function fetchTrendingCoins() {
    try {
        showLoading();
        
        // Check if we have cached data that's still valid
        const cachedData = await getCachedData();
        if (cachedData) {
            renderTrendingCoins(cachedData);
            showTrends();
            return;
        }
        
        // Fetch fresh data if no valid cache
        const response = await fetch(TRENDING_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter for memecoins (simplified approach - in a real app, you'd need a more robust way to identify memecoins)
        // Here we're just taking the top 5 from the trending coins
        const trendingCoins = data.coins.slice(0, 5).map(item => ({
            id: item.item.id,
            name: item.item.name,
            symbol: item.item.symbol,
            logoUrl: item.item.large || '',
            price: item.item.price_btc * 30000, // Converting BTC price to USD estimation
            priceChange: item.item.price_change_percentage_24h?.usd || 0
        }));
        
        // Cache the data
        await cacheData(trendingCoins);
        
        // Render the data
        renderTrendingCoins(trendingCoins);
        showTrends();
        
        // Update last updated time
        document.getElementById('lastUpdatedTime').textContent = formatLastUpdated();
        
    } catch (error) {
        console.error('Error fetching trending coins:', error);
        showError();
    }
}

// Function to cache trending data
async function cacheData(data) {
    try {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            expiresAt: Date.now() + (CACHE_DURATION * 60 * 1000)
        };
        
        await chrome.storage.local.set({ 'trendingCoinsCache': cacheItem });
    } catch (error) {
        console.error('Error caching trending data:', error);
    }
}

// Function to get cached data if it's still valid
async function getCachedData() {
    try {
        const { trendingCoinsCache } = await chrome.storage.local.get('trendingCoinsCache');
        
        if (trendingCoinsCache && trendingCoinsCache.expiresAt > Date.now()) {
            // Update last updated time from cache timestamp
            const cacheDate = new Date(trendingCoinsCache.timestamp);
            const hours = cacheDate.getHours().toString().padStart(2, '0');
            const minutes = cacheDate.getMinutes().toString().padStart(2, '0');
            document.getElementById('lastUpdatedTime').textContent = `Last updated: ${hours}:${minutes}`;
            
            return trendingCoinsCache.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting cached data:', error);
        return null;
    }
}

// Function to render trending coins in the UI
function renderTrendingCoins(coins) {
    const trendsList = document.getElementById('trendsList');
    trendsList.innerHTML = '';
    
    const template = document.getElementById('trendItemTemplate');
    
    coins.forEach(coin => {
        const trendItem = template.content.cloneNode(true);
        
        // Set coin logo
        const coinLogo = trendItem.querySelector('.coin-logo');
        coinLogo.style.backgroundImage = `url(${coin.logoUrl})`;
        
        // Set coin name and symbol
        trendItem.querySelector('.coin-name').textContent = coin.name;
        trendItem.querySelector('.coin-symbol').textContent = coin.symbol.toUpperCase();
        
        // Set coin price
        trendItem.querySelector('.coin-price').textContent = formatCurrency(coin.price);
        
        // Set price change with appropriate class for color
        const changeElement = trendItem.querySelector('.coin-change');
        changeElement.textContent = formatPercentage(coin.priceChange);
        
        if (coin.priceChange > 0) {
            changeElement.classList.add('positive-change');
        } else if (coin.priceChange < 0) {
            changeElement.classList.add('negative-change');
        }
        
        // Add click handler for the item
        const itemElement = trendItem.querySelector('.trend-item');
        itemElement.addEventListener('click', () => {
            // Open a link to view more details about the coin
            window.open(`https://www.coingecko.com/en/coins/${coin.id}`, '_blank');
        });
        
        trendsList.appendChild(trendItem);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch trending coins on load
    await fetchTrendingCoins();
    
    // Add event listener for refresh button
    document.getElementById('refreshButton').addEventListener('click', async () => {
        // Clear cache and fetch fresh data
        await chrome.storage.local.remove('trendingCoinsCache');
        await fetchTrendingCoins();
    });
    
    // Add event listener for retry button
    document.getElementById('retryButton').addEventListener('click', async () => {
        await fetchTrendingCoins();
    });
});
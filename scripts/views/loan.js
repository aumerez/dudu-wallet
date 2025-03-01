// loan.js
window.LoanModule = (function() {
    // Private variables
    let ipAmountInput;
    let pipeAmountDisplay;
    let confirmLoanButton;
    let statusMessage;
    let transactionHash;
    
    // Constants for conversion
    const IP_TO_PIPE_RATE = 0.00001; // 1 PIPE costs 0.00001 IP
    const COLLATERAL_RATIO = 0.4; // 40% collateral ratio
    
    // Calculate PIPE amount based on IP input
    function calculatePipeAmount() {
        const ipAmount = parseFloat(ipAmountInput.value) || 0;
        
        if (ipAmount <= 0) {
            pipeAmountDisplay.textContent = '0';
            confirmLoanButton.disabled = true;
            return;
        }
        
        // Calculate how many PIPE tokens the user will receive (60% of IP value)
        const collateralAmount = ipAmount * COLLATERAL_RATIO; // 40% held as collateral
        const availableIPValue = ipAmount - collateralAmount; // 60% available for PIPE tokens
        
        // Convert available IP to PIPE tokens
        const pipeAmount = availableIPValue / IP_TO_PIPE_RATE;
        
        // Display the calculated amount with 2 decimal places
        pipeAmountDisplay.textContent = pipeAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // Enable the confirm button if there's a valid amount
        confirmLoanButton.disabled = false;
    }
    
    // Handle loan confirmation
    function confirmLoan() {
        console.log("Confirm loan button clicked"); // Debug log
        
        const ipAmount = parseFloat(ipAmountInput.value) || 0;
        
        if (ipAmount <= 0) {
            setStatusMessage('Please enter a valid IP amount', 'error');
            return;
        }
        
        // Disable the button to prevent multiple clicks
        confirmLoanButton.disabled = true;
        confirmLoanButton.textContent = 'Processing...';
        
        // Simulate transaction processing
        setStatusMessage('Transaction pending...', 'pending');
        
        // Simulate successful transaction after 5 seconds
        setTimeout(() => {
            // Generate a mock transaction hash
            const mockTxHash = '0x' + Array.from({length: 64}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('');
            
            // Update status message and display transaction hash
            setStatusMessage('Transaction approved!', 'success');
            transactionHash.textContent = `Transaction: ${mockTxHash}`;
            
            // Reset form state
            confirmLoanButton.textContent = 'Confirm Loan';
            confirmLoanButton.disabled = false;
        }, 5000);
    }
    
    function setStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = '';
        
        if (type) {
            statusMessage.classList.add(type);
        }
    }
    
    // Public functions
    function init() {
        console.log("LoanModule initializing"); // Debug log
        
        // Initialize DOM elements after a short delay to ensure DOM is ready
        setTimeout(() => {
            ipAmountInput = document.getElementById('ipAmount');
            pipeAmountDisplay = document.getElementById('pipeAmount');
            confirmLoanButton = document.getElementById('confirm-loan-button');
            statusMessage = document.getElementById('loan-status-message');
            transactionHash = document.getElementById('loan-transaction-hash');
            
            console.log("DOM elements found:", {
                ipAmountInput: !!ipAmountInput,
                pipeAmountDisplay: !!pipeAmountDisplay,
                confirmLoanButton: !!confirmLoanButton,
                statusMessage: !!statusMessage,
                transactionHash: !!transactionHash
            }); // Debug log
            
            if (confirmLoanButton) {
                // Directly use onclick instead of addEventListener for better compatibility
                confirmLoanButton.onclick = confirmLoan;
                console.log("Click handler attached to confirmLoanButton");
            }
            
            if (ipAmountInput) {
                ipAmountInput.oninput = calculatePipeAmount;
                console.log("Input handler attached to ipAmountInput");
            }
            
            // Initialize calculation
            calculatePipeAmount();
        }, 100);
    }
    
    // Return public API
    return {
        init: init,
        // Expose for debug
        confirmLoan: confirmLoan
    };
})();

// Multiple ways to ensure initialization happens
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded event fired");
    window.LoanModule.init();
});

// Additional initialization for when content is loaded dynamically
function initLoanModule() {
    console.log("initLoanModule called");
    window.LoanModule.init();
}

// Expose for immediate execution if needed
window.initLoanModule = initLoanModule;

// Fallback initialization
setTimeout(function() {
    console.log("Fallback initialization triggered");
    window.LoanModule.init();
}, 500);
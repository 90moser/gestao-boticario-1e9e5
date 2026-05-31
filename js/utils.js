function getDaysSince(dateString) {
    if (!dateString) return 999;
    var lastVisit = new Date(dateString + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diffTime = today - lastVisit;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getVisitStatusColor(days) {
    if (days <= 10) return "text-green-500";
    if (days <= 14) return "text-yellow-500";
    return "text-red-500";
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function safeNumber(value) {
    return isNaN(value) || !isFinite(value) ? 0 : value;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}

function calculateDaysUntilExpiry(expiryDate) {
    var today = new Date();
    var expiry = new Date(expiryDate);
    var diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMonthRange() {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), 1);
    var end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: start, end: end };
}

function calculateDaysSince(date) {
    var today = new Date();
    var target = new Date(date);
    var diffTime = today - target;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

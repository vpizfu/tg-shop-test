const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch(e) {}

const API_URL = 'https://script.google.com/macros/s/AKfycbzo-HEFFXRjN6PQrhWNhlInY2sP244r30gOyAMHLA0y2mAbA8jcOUtr1RcFhL1A8GliQ/exec';

const CATEGORIES = ['', 'iPhone', 'iPad', 'MacBook', 'Apple Watch', 'AirPods'];
let selectedCategory = '', query = '', randomIds = [], loadedCount = 10, imageCache = new Map(), 
    productsData = null, currentProduct = null, selectedOption = {}, searchTimeout = null, 
    cartCount = 0, currentTab = 'shop', fullscreenImages = [], fullscreenCurrentIndex = 0, 
    modalCurrentIndex = 0, modalImageCount = 0;

const root = document.getElementById('root');
const modal = document.getElementById('productModal');
const fullscreenModal = document.getElementById('fullscreenModal');
const PLACEHOLDERS = {
    'iPhone': 'https://via.placeholder.com/300x300/007AFF/FFFFFF?text=iPhone',
    'iPad': 'https://via.placeholder.com/300x300/34C759/FFFFFF?text=iPad',
    'MacBook': 'https://via.placeholder.com/300x300/FFD60A/000000?text=MacBook',
    'Apple Watch': 'https://via.placeholder.com/300x300/AF52DE/FFFFFF?text=Watch',
    'AirPods': 'https://via.placeholder.com/300x300/30D158/FFFFFF?text=AirPods'
};
const FILTER_ORDER = ['simType', 'storage', 'color', 'region'];

document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

let lastTouchEnd = 0;
document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
}, { passive: false });

function initTabBar() {
    document.querySelectorAll('.tab-bar .tab-item').forEach(tab => {
        tab.onclick = e => {
            e.preventDefault();
            switchTab(tab.dataset.tab);
            updateCartBadge();
        };
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-bar .tab-item').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    if (tabName === 'shop') render();
    else if (tabName === 'cart') showCartTab();
    else if (tabName === 'sale') showSaleTab();
    else if (tabName === 'profile') showProfileTab();
    else if (tabName === 'about') showAboutTab();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (cartCount > 0) {
        badge.textContent = cartCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function addToCart() { 
    cartCount++; 
    updateCartBadge(); 
    tg?.HapticFeedback?.notificationOccurred('success');
    tg?.showAlert(`Добавлено в корзину! (${cartCount})`);
}

async function initApp() {
    initTabBar();
    try {
        root.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[400px]">
                <div class="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <div class="text-lg font-semibold text-gray-700 mb-2">Загрузка...</div>
            </div>
        `;
        
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const products = await response.json();
        if (!Array.isArray(products) || products.length === 0) throw new Error('Нет данных');
        
        productsData = products.flatMap(product =>
            product.variants.map(variant => ({
                id: variant.id,
                name: product.name,
                price: parseFloat(variant.price) || 0,
                cat: product.category,
                code: variant.id,
                storage: variant.memory,
                region: variant.region,
                simType: variant.sim,
                color: variant.color,
                images: Array.isArray(variant.images) ? variant.images : []
            }))
        );
        
        if (selectedCategory) randomIds = pickRandomIds(productsData, 20);
        render();
    } catch (error) {
        console.error('API', error);
        showError(error.message);
    }
}

function showError(message) {
    root.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-screen text-center p-8">
            <div class="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Ошибка</h2>
            <p class="text-lg text-red-600 mb-2">${escapeHtml(message)}</p>
            <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all">Повторить</button>
        </div>
    `;
    tg?.showAlert(message);
}

function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}

// Modals events
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
fullscreenModal?.addEventListener('click', e => { if (e.target === fullscreenModal) closeFullscreen(); });

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (fullscreenModal.classList.contains('active')) closeFullscreen();
        else if (!modal.classList.contains('hidden')) closeModal();
    }
});

initApp();

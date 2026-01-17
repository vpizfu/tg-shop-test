const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch (e) {}

const API_URL = 'https://script.google.com/macros/s/AKfycbzo-HEFFXRjN6PQrhWNhlInY2sP244r30gOyAMHLA0y2mAbA8jcOUtr1RcFhL_1A8GliQ/exec';
const CATEGORIES = ['Все', 'iPhone', 'iPad', 'MacBook', 'Apple Watch', 'AirPods'];

let selectedCategory = 'Все',
    query = '',
    randomIds = [],
    loadedCount = 10,
    imageCache = new Map(),
    productsData = null,
    currentProduct = null,
    selectedOption = {},
    searchTimeout = null,
    cartCount = 0,
    currentTab = 'shop';

const root = document.getElementById('root');
const modal = document.getElementById('productModal');
const fullscreenModal = document.getElementById('fullscreenModal');

// Запрет зума
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// Таббар
function initTabBar() {
  document.querySelectorAll('#tabBar .tab-item').forEach(tab => {
    tab.onclick = (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    };
  });
  updateCartBadge();
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('#tabBar .tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');

  if (tabName === 'shop') {
    renderShop();
  } else if (tabName === 'cart') {
    showCartTab();
  } else if (tabName === 'sale') {
    showSaleTab();
  } else if (tabName === 'profile') {
    showProfileTab();
  } else if (tabName === 'about') {
    showAboutTab();
  }
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
  tg?.showAlert?.('✅ Добавлено в корзину!\nВсего товаров: ' + cartCount);
}

// Вкладка корзины
function showCartTab() {
  root.innerHTML =
    '<div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">' +
      '<div class="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">' +
        '<svg class="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                ' d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>' +
        '</svg>' +
      '</div>' +
      '<h2 class="text-2xl font-bold text-gray-800 mb-4">Корзина</h2>' +
      '<p class="text-lg text-gray-600 mb-8">Товаров: ' +
        '<span class="font-bold text-blue-600">' + cartCount + '</span></p>' +
      '<div class="space-y-3 w-full max-w-sm">' +
        '<button onclick="addToCart()" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all">' +
          'Добавить тестовый товар' +
        '</button>' +
        '<button class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all">' +
          'Оформить заказ' +
        '</button>' +
      '</div>' +
    '</div>';
}

// Вкладка распродажи
function showSaleTab() {
  root.innerHTML =
    '<div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">' +
      '<div class="w-24 h-24 bg-orange-100 rounded-3xl flex items-center justify-center mb-6">' +
        '<svg class="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                ' d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
        '</svg>' +
      '</div>' +
      '<h2 class="text-2xl font-bold text-gray-800 mb-4">Распродажа</h2>' +
      '<p class="text-lg text-gray-600 mb-8">Скоро здесь будут скидки до 70%!</p>' +
      '<button onclick="switchTab(\'shop\')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all">' +
        'В магазин' +
      '</button>' +
    '</div>';
}

// Вкладка профиль
function showProfileTab() {
  const userId = tg?.initDataUnsafe?.user?.id || 'гость';
  root.innerHTML =
    '<div class="p-6 space-y-6">' +
      '<div class="flex items-center space-x-4">' +
        '<div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">' +
          '<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                  ' d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>' +
          '</svg>' +
        '</div>' +
        '<div>' +
          '<h2 class="text-xl font-bold">Пользователь</h2>' +
          '<p class="text-gray-500">ID: ' + userId + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="space-y-3">' +
        '<button class="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-all flex items-center">' +
          '<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                  ' d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                  ' d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
          '</svg>' +
          'Настройки' +
        '</button>' +
        '<button class="w-full bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 px-4 rounded-xl transition-all flex items-center">' +
          '<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                  ' d="M6 18L18 6M6 6l12 12"/>' +
          '</svg>' +
          'Выйти' +
        '</button>' +
      '</div>' +
    '</div>';
}

// Вкладка "О нас"
function showAboutTab() {
  root.innerHTML =
    '<div class="p-6 space-y-6">' +
      '<h2 class="text-2xl font-bold text-gray-800 mb-4">О нас</h2>' +
      '<div class="space-y-4 text-gray-700">' +
        '<p>Магазин премиальной техники Apple с гарантией качества и лучшими ценами.</p>' +
        '<div class="grid grid-cols-2 gap-4 mt-8">' +
          '<div class="text-center p-4 bg-blue-50 rounded-xl">' +
            '<div class="text-2xl font-bold text-blue-600">1000+</div>' +
            '<div class="text-sm text-gray-600">товаров</div>' +
          '</div>' +
          '<div class="text-center p-4 bg-green-50 rounded-xl">' +
            '<div class="text-2xl font-bold text-green-600">24/7</div>' +
            '<div class="text-sm text-gray-600">поддержка</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// Ошибка
function showError(message) {
  root.innerHTML = '' +
    '<div class="flex flex-col items-center justify-center min-h-screen text-center p-8">' +
      '<div class="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">' +
        '<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                ' d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
        '</svg>' +
      '</div>' +
      '<h2 class="text-2xl font-bold text-gray-800 mb-4">Ошибка загрузки</h2>' +
      '<p class="text-lg text-red-600 mb-2">' + escapeHtml(message) + '</p>' +
      '<button onclick="location.reload()"' +
              ' class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all">' +
        'Попробовать снова' +
      '</button>' +
    '</div>';
  tg?.showAlert?.('❌ ' + message);
}

// Утилита
function escapeHtml(s) {
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
  return String(s).replace(/[&<>"']/g, m => map[m]);
}

// Клик по бэкдропу
if (modal) {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}
if (fullscreenModal) {
  fullscreenModal.addEventListener('click', e => {
    if (e.target === fullscreenModal) closeFullscreen();
  });
}

// ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (fullscreenModal.classList.contains('active')) {
      closeFullscreen();
    } else if (!modal.classList.contains('hidden')) {
      closeModal();
    }
  }
});

// Инициализация
async function initApp() {
  initTabBar();

  root.innerHTML =
    '<div class="flex flex-col items-center justify-center min-h-[400px]">' +
      '<div class="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>' +
      '<div class="text-lg font-semibold text-gray-700 mb-2">Загрузка товаров...</div>' +
    '</div>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Нет товаров');
    }

    productsData = normalizeProducts(products);
    if (selectedCategory === 'Все') {
      randomIds = pickRandomIds(productsData, Math.min(20, productsData.length));
    }
  } catch (error) {
    console.error('API error:', error);
    showError(error.message);
    return;
  }

  renderShop();
}

initApp();

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
    currentTab = 'shop',
    fullscreenImages = [],
    fullscreenCurrentIndex = 0,
    modalCurrentIndex = 0,
    modalImageCount = 0;

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
    render();
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

function getProductVariants(productName) {
  return productsData ? productsData.filter(p => p.name === productName) : [];
}

function getFilteredProductImages(variants) {
  const images = new Set();
  variants.forEach(variant => {
    if (variant.images && Array.isArray(variant.images)) {
      variant.images.forEach(img => {
        if (img && img.trim()) images.add(img);
      });
    }
  });
  return Array.from(images);
}

function getFilteredVariants(variants) {
  return variants.filter(variant => {
    return FILTER_ORDER.every(type => {
      const selectedValue = selectedOption[type];
      return !selectedValue || variant[type] === selectedValue;
    });
  });
}

function getAvailableOptions(type, variants) {
  const filteredVariants = getFilteredVariants(variants);
  const options = [...new Set(filteredVariants.map(v => v[type]).filter(Boolean))];
  return options.sort();
}

function isCompleteSelection() {
  return FILTER_ORDER.every(type => selectedOption[type]);
}

function getCurrentSectionIndex() {
  for (let i = 0; i < FILTER_ORDER.length; i++) {
    if (!selectedOption[FILTER_ORDER[i]]) return i;
  }
  return FILTER_ORDER.length;
}

async function initApp() {
  initTabBar();

  try {
    root.innerHTML =
      '<div class="flex flex-col items-center justify-center min-h-[400px]">' +
        '<div class="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>' +
        '<div class="text-lg font-semibold text-gray-700 mb-2">Загрузка товаров...</div>' +
      '</div>';

    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Нет товаров');
    }

    productsData = products.flatMap(product =>
      product.variants.map(variant => ({
        id: variant.id,
        name: product.name,
        price: parseFloat(variant.price) || 0,
        cat: product.category,
        code: variant.id,
        storage: variant.memory || '',
        region: variant.region || '',
        simType: variant.sim || '',
        color: variant.color || '',
        images: Array.isArray(variant.images) ? variant.images : []
      }))
    );

    if (selectedCategory === 'Все') {
      randomIds = pickRandomIds(productsData, Math.min(20, productsData.length));
    }
  } catch (error) {
    console.error('API error:', error);
    showError(error.message);
    return;
  }

  render();
}

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

function getLabel(type) {
  const labels = { simType: 'SIM/eSIM', storage: 'Память', color: 'Цвет', region: 'Регион' };
  return labels[type] || type;
}

function setupHandlers() {
  const categoryEl = document.getElementById('category');
  const searchEl = document.getElementById('search');

  if (categoryEl) {
    categoryEl.onchange = function(e) {
      selectedCategory = e.target.value;
      loadedCount = 10;
      if (selectedCategory === 'Все') {
        randomIds = pickRandomIds(productsData || [], 20);
      }
      render();
    };
  }

  if (searchEl) {
    searchEl.oninput = function(e) {
      query = e.target.value || '';
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        loadedCount = 10;
        render();
      }, 500);
    };
  }

  // Открытие модалки по клику на карточку
  document.querySelectorAll('[data-product-name]').forEach(card => {
    card.addEventListener('click', function(e) {
      // игнорируем клики по кнопкам карусели и точкам
      if (e.target.closest('button') || e.target.closest('.dot')) {
        return;
      }
      const productName = card.dataset.productName;
      const product = productsData.find(p => p.name === productName);
      if (product) {
        selectedOption = {};
        showModal(product);
        tg?.HapticFeedback?.impactOccurred('medium');
      }
    });
  });
}

function render() {
  if (!productsData || productsData.length === 0) {
    root.innerHTML = '<div class="text-center p-20 text-gray-500">Нет товаров</div>';
    return;
  }

  const list = getVisibleProducts();
  const showCount = Math.min(loadedCount, list.length);

  root.innerHTML =
    '<div class="mb-5">' +
      '<h1 class="text-3xl font-bold text-center mb-4">🛒 Магазин</h1>' +
      '<div class="flex items-center gap-3">' +
        '<div class="flex-1 bg-white rounded-2xl shadow px-3 py-2">' +
          '<label class="text-xs text-gray-500 block mb-1">Категория</label>' +
          '<select id="category" class="w-full bg-transparent border-none font-semibold text-base focus:outline-none appearance-none">' +
            CATEGORIES.map(c => (
              '<option value="' + c + '"' + (c === selectedCategory ? ' selected' : '') + '>' + c + '</option>'
            )).join('') +
          '</select>' +
        '</div>' +
        '<div class="w-44 bg-white rounded-2xl shadow px-3 py-2">' +
          '<label class="text-xs text-gray-500 block mb-1">Поиск</label>' +
          '<div class="flex items-center">' +
            '<svg class="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                    ' d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>' +
            '</svg>' +
            '<input id="search" value="' + escapeHtml(query) + '" placeholder="Поиск..."' +
                   ' class="w-full bg-transparent outline-none text-sm text-gray-900" />' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mt-3 text-xs text-gray-500">' +
        'Показано: <span class="font-semibold">' + showCount + '</span> из ' + list.length +
      '</div>' +
    '</div>' +
    '<div class="product-grid" id="productGrid">' +
      list.slice(0, showCount).map(productCard).join('') +
    '</div>';

  setupHandlers();
  preloadAllImages(list.slice(0, showCount));
  setupImageCarousels();
}

function productCard(product) {
  const variants = getProductVariants(product.name);
  const allImages = getFilteredProductImages(variants);
  const images = allImages.length > 0
    ? allImages.slice(0, 3)
    : [PLACEHOLDERS[product.cat] || PLACEHOLDERS['iPhone']];
  const cheapestVariant = variants.reduce((min, p) => (p.price < min.price ? p : min), variants[0]);
  const carouselId = 'carousel_' + Math.random().toString(36).substr(2, 9);

  return (
    '<div class="bg-white rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-all group cursor-pointer relative"' +
      ' data-product-name="' + escapeHtml(product.name) + '"' +
      ' data-carousel-id="' + carouselId + '">' +
      '<div class="w-full h-32 rounded-xl mb-3 image-carousel h-32 group-hover:scale-105 transition-transform cursor-pointer">' +
        '<div class="image-carousel-inner" data-carousel="' + carouselId + '" data-current="0">' +
          images.map((img, idx) =>
            '<img src="' + img + '" class="carousel-img' + (idx === 0 ? ' loaded' : '') +
            '" alt="Product ' + (idx + 1) + '" />'
          ).join('') +
        '</div>' +
        (images.length > 1
          ? '<button class="nav-btn nav-prev" onclick="carouselPrev(\'' + carouselId + '\'); event.stopPropagation()">‹</button>' +
            '<button class="nav-btn nav-next" onclick="carouselNext(\'' + carouselId + '\'); event.stopPropagation()">›</button>' +
            '<div class="carousel-dots">' +
              images.map((_, idx) =>
                '<div class="dot' + (idx === 0 ? ' active' : '') +
                '" onclick="carouselGoTo(\'' + carouselId + '\',' + idx + '); event.stopPropagation()"></div>'
              ).join('') +
            '</div>'
          : ''
        ) +
      '</div>' +
      '<div class="font-bold text-base mb-1 truncate">' + escapeHtml(product.name) + '</div>' +
      '<div class="text-blue-600 font-black text-xl mb-1">$' + cheapestVariant.price + '</div>' +
      '<div class="text-xs text-gray-500 mb-4">' + variants.length + ' вариантов</div>' +
    '</div>'
  );
}

function selectOptionNoFocus(type, option) {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  if (selectedOption[type] === option) {
    const typeIndex = FILTER_ORDER.indexOf(type);
    for (let i = typeIndex; i < FILTER_ORDER.length; i++) {
      delete selectedOption[FILTER_ORDER[i]];
    }
  } else {
    const typeIndex = FILTER_ORDER.indexOf(type);
    for (let i = typeIndex + 1; i < FILTER_ORDER.length; i++) {
      delete selectedOption[FILTER_ORDER[i]];
    }
    selectedOption[type] = option;
  }

  renderProductModal(currentProduct);
  tg?.HapticFeedback?.impactOccurred('light');
}

// Карусели на карточках
function setupImageCarousels() {
  document.querySelectorAll('.image-carousel-inner[data-carousel]').forEach(inner => {
    const dots = inner.parentElement.querySelectorAll('.dot');
    const carouselId = inner.dataset.carousel;
    let currentIndex = 0;

    function updateCarousel() {
      inner.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex);
      });
    }

    window['carouselNext_' + carouselId] = function() {
      currentIndex = (currentIndex + 1) % inner.children.length;
      updateCarousel();
      tg?.HapticFeedback?.selectionChanged();
    };

    window['carouselPrev_' + carouselId] = function() {
      currentIndex = currentIndex === 0 ? inner.children.length - 1 : currentIndex - 1;
      updateCarousel();
      tg?.HapticFeedback?.selectionChanged();
    };

    window['carouselGoTo_' + carouselId] = function(index) {
      currentIndex = index;
      updateCarousel();
      tg?.HapticFeedback?.selectionChanged();
    };

    dots.forEach((dot, idx) => {
      dot.onclick = function(e) {
        e.stopPropagation();
        currentIndex = idx;
        updateCarousel();
        tg?.HapticFeedback?.selectionChanged();
      };
    });

    updateCarousel();
  });
}

window.carouselNext = function(id) {
  window['carouselNext_' + id] && window['carouselNext_' + id]();
};
window.carouselPrev = function(id) {
  window['carouselPrev_' + id] && window['carouselPrev_' + id]();
};
window.carouselGoTo = function(id, index) {
  window['carouselGoTo_' + id] && window['carouselGoTo_' + id](index);
};

// Fullscreen (только из модалки)
function openFullscreen(images, startIndex) {
  if (!images || images.length === 0) return;
  fullscreenImages = images;
  fullscreenCurrentIndex = startIndex || 0;
  updateFullscreenCarousel();
  fullscreenModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  tg?.expand();
}

window.openFullscreenModal = function() {
  const imgs = Array.from(document.querySelectorAll('#modalCarouselInner .carousel-img'))
    .map(img => img.src);
  openFullscreen(imgs, modalCurrentIndex);
};

function updateFullscreenCarousel() {
  const container = document.getElementById('fullscreenCarousel');
  container.innerHTML =
    '<div class="flex items-center justify-center w-full h-full">' +
      '<img src="' + fullscreenImages[fullscreenCurrentIndex] + '"' +
           ' class="carousel-img loaded"' +
           ' alt="Fullscreen image ' + (fullscreenCurrentIndex + 1) + '"' +
           ' loading="lazy" />' +
    '</div>';

  const prevBtn = document.getElementById('fsPrev');
  const nextBtn = document.getElementById('fsNext');
  const hasMany = fullscreenImages.length > 1;
  prevBtn.style.display = hasMany ? 'flex' : 'none';
  nextBtn.style.display = hasMany ? 'flex' : 'none';
}

window.fullscreenNext = function() {
  if (fullscreenImages.length <= 1) return;
  fullscreenCurrentIndex = (fullscreenCurrentIndex + 1) % fullscreenImages.length;
  updateFullscreenCarousel();
  tg?.HapticFeedback?.selectionChanged();
};

window.fullscreenPrev = function() {
  if (fullscreenImages.length <= 1) return;
  fullscreenCurrentIndex = fullscreenCurrentIndex === 0
    ? fullscreenImages.length - 1
    : fullscreenCurrentIndex - 1;
  updateFullscreenCarousel();
  tg?.HapticFeedback?.selectionChanged();
};

window.closeFullscreen = function() {
  fullscreenModal.classList.remove('active');
  document.body.style.overflow = '';
};

// Сохранение текущего индекса модалки при выходе из fullscreen
let modalImageIndexBeforeFullscreen = 0;

// Модальная карусель
function initModalCarousel(imageCount) {
  if (imageCount <= 1) return;
  modalImageCount = imageCount;
  const inner = document.getElementById('modalCarouselInner');
  if (!inner) return;

  function updateModalCarousel() {
    inner.style.transform = 'translateX(-' + (modalCurrentIndex * 100) + '%)';
    document.querySelectorAll('#modalDots .dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === modalCurrentIndex);
    });
  }

  window.modalNext = function() {
    modalCurrentIndex = (modalCurrentIndex + 1) % modalImageCount;
    updateModalCarousel();
    tg?.HapticFeedback?.selectionChanged();
  };

  window.modalPrev = function() {
    modalCurrentIndex = modalCurrentIndex === 0 ? modalImageCount - 1 : modalCurrentIndex - 1;
    updateModalCarousel();
    tg?.HapticFeedback?.selectionChanged();
  };

  window.modalGoTo = function(i) {
    modalCurrentIndex = i;
    updateModalCarousel();
    tg?.HapticFeedback?.selectionChanged();
  };

  updateModalCarousel();
}

function clearOptionNoFocus(type) {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  const typeIndex = FILTER_ORDER.indexOf(type);
  for (let i = typeIndex; i < FILTER_ORDER.length; i++) {
    delete selectedOption[FILTER_ORDER[i]];
  }
  renderProductModal(currentProduct);
  tg?.HapticFeedback?.impactOccurred('light');
}

window.selectOptionNoFocus = selectOptionNoFocus;
window.clearOptionNoFocus = clearOptionNoFocus;

window.addToCartFromModal = function() {
  if (!isCompleteSelection()) {
    tg?.showAlert?.('❌ Выберите все опции: SIM → Память → Цвет → Регион');
    return;
  }
  const variants = getFilteredVariants(getProductVariants(currentProduct.name));
  if (variants.length === 0) {
    tg?.showAlert?.('❌ Нет доступных вариантов');
    return;
  }
  const selectedVariant = variants[0];
  addToCart();
  tg?.showAlert?.(
    '✅ ' + selectedVariant.name + '\n' +
    selectedVariant.storage + ' | ' +
    selectedVariant.color + ' | ' +
    selectedVariant.region + '\n$' +
    selectedVariant.price
  );
  closeModal();
};

function renderProductModal(product) {
  currentProduct = product;
  const variants = getProductVariants(product.name);
  const filteredVariants = getFilteredVariants(variants);
  const availableOptions = {};

  FILTER_ORDER.forEach(type => {
    availableOptions[type] = getAvailableOptions(type, variants);
  });

  const complete = isCompleteSelection();
  const filteredImages = complete ? getFilteredProductImages(filteredVariants) : [];
  modalImageIndexBeforeFullscreen = modalCurrentIndex;

  document.getElementById('modalContent').innerHTML =
    '<div class="flex flex-col h-full">' +
      '<div class="p-6 pb-4 border-b border-gray-200">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<h2 class="text-2xl font-bold">' + escapeHtml(product.name) + '</h2>' +
          '<button onclick="closeModal()" class="p-2 hover:bg-gray-100 rounded-xl">' +
            '<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                    ' d="M6 18L18 6M6 6l12 12"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="flex items-center gap-2 text-sm text-gray-500">' +
          '<span>от $' + Math.min.apply(null, variants.map(v => v.price)) + '</span>' +
          '<span>• ' + variants.length + ' вариантов</span>' +
        '</div>' +
      '</div>' +

      '<div class="flex-1 overflow-y-auto">' +
        '<div class="modal-image-section">' +
          '<div class="w-full h-64 image-carousel h-64 rounded-xl overflow-hidden cursor-pointer mb-6"' +
               ' id="modalCarousel"' +
               (complete && filteredImages.length > 0
                 ? ' onclick="openFullscreenModal()"'
                 : ' style="cursor: default;"') +
               '>' +
            (complete && filteredImages.length > 0
              ? '<div class="image-carousel-inner" id="modalCarouselInner">' +
                  filteredImages.slice(0, 10).map(img =>
                    '<img src="' + img + '" class="carousel-img loaded" alt="Product image" loading="lazy" />'
                  ).join('') +
                '</div>' +
                (filteredImages.length > 1
                  ? '<button class="nav-btn nav-prev" onclick="modalPrev(); event.stopPropagation()">‹</button>' +
                    '<button class="nav-btn nav-next" onclick="modalNext(); event.stopPropagation()">›</button>' +
                    '<div class="carousel-dots" id="modalDots">' +
                      filteredImages.map((_, idx) =>
                        '<div class="dot' +
                               (idx === modalImageIndexBeforeFullscreen ? ' active' : '') +
                               '" onclick="modalGoTo(' + idx + '); event.stopPropagation()"></div>'
                      ).join('') +
                    '</div>'
                  : ''
                )
              : '<div class="no-images h-64">' +
                  '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                          ' d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
                  '</svg>' +
                  '<div class="text-center text-sm font-medium">Выберите все параметры для просмотра фото</div>' +
                '</div>'
            ) +
          '</div>' +
        '</div>' +

        '<div class="p-6 space-y-4">' +
          FILTER_ORDER.map((type, index) => {
            const isLocked = index > getCurrentSectionIndex();
            return (
              '<div class="option-section ' + (isLocked ? 'locked' : 'unlocked') +
                   '" data-section="' + type + '">' +
                '<label class="text-sm font-semibold text-gray-700 capitalize mb-2 block">' +
                  getLabel(type) +
                '</label>' +
                '<div class="flex gap-2 scroll-carousel pb-1">' +
                  availableOptions[type].map(option => {
                    const isSelected = selectedOption[type] === option;
                    return (
                      '<button class="option-btn px-3 py-1.5 text-xs font-medium rounded-full border scroll-item w-[80px] ' +
                              (isSelected
                                ? 'bg-blue-500 text-white border-blue-500 shadow-md font-bold'
                                : 'bg-gray-100 border-gray-300 hover:bg-gray-200') +
                              ' transition-all"' +
                              ' data-type="' + type + '"' +
                              ' data-option="' + escapeHtml(option) + '"' +
                              ' onclick="selectOptionNoFocus(\'' + type + '\', \'' + escapeHtml(option) + '\'); return false;">' +
                        escapeHtml(option) +
                      '</button>'
                    );
                  }).join('') +
                  (selectedOption[type]
                    ? '<button onclick="clearOptionNoFocus(\'' + type + '\'); return false;"' +
                             ' class="px-3 py-1.5 text-xs text-red-500 font-medium rounded-full border border-red-200 hover:bg-red-50 scroll-item w-12">✕</button>'
                    : ''
                  ) +
                '</div>' +
                (!availableOptions[type].length
                  ? '<p class="text-xs text-gray-400 mt-1">Нет вариантов</p>'
                  : ''
                ) +
              '</div>'
            );
          }).join('') +

          '<div class="pt-4 border-t">' +
            '<div class="text-center text-sm text-gray-500 mb-4">' +
              'Доступно: <span id="variantCount" class="font-bold text-blue-600">' +
                filteredVariants.length +
              '</span> вариантов' +
              (complete && filteredVariants.length === 1
                ? '<div class="text-xs mt-1 bg-blue-50 border border-blue-200 rounded-xl p-2">' +
                    '✅ Выбран: ' + filteredVariants[0].storage + ' | ' +
                                   filteredVariants[0].color + ' | ' +
                                   filteredVariants[0].region +
                  '</div>'
                : ''
              ) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="p-6 border-t bg-white">' +
        '<button onclick="addToCartFromModal()"' +
                ' class="w-full ' +
                  (complete && filteredVariants.length > 0
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-400 cursor-not-allowed') +
                  ' text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-lg transform hover:-translate-y-0.5 transition-all"' +
                (complete && filteredVariants.length > 0 ? '' : ' disabled') +
                '>' +
          (complete && filteredVariants.length > 0
            ? '✅ В корзину $' + (filteredVariants[0] && filteredVariants[0].price ? filteredVariants[0].price : '')
            : 'Выберите все опции') +
        '</button>' +
      '</div>' +
    '</div>';

  if (complete && filteredImages.length > 0) {
    modalCurrentIndex = modalImageIndexBeforeFullscreen;
    initModalCarousel(filteredImages.length);
  }
}

function getVisibleProducts() {
  if (!productsData) return [];
  let base = selectedCategory === 'Все'
    ? productsData.filter(p => randomIds.indexOf(p.id) !== -1)
    : productsData.filter(p => p.cat === selectedCategory);

  const grouped = {};
  base.forEach(p => {
    if (!grouped[p.name] || p.price < grouped[p.name].price) grouped[p.name] = p;
  });

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    return Object.values(grouped).filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.cat && p.cat.toLowerCase().includes(q))
    );
  }
  return Object.values(grouped);
}

function pickRandomIds(items, count) {
  const ids = items.map(x => x.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  return ids.slice(0, Math.min(count, ids.length));
}

function preloadAllImages(products) {
  products.forEach(product => {
    const variants = getProductVariants(product.name);
    const allImages = getFilteredProductImages(variants);
    allImages.forEach(imgSrc => {
      if (!imageCache.has(imgSrc) && imgSrc) {
        const img = new Image();
        img.onload = () => imageCache.set(imgSrc, true);
        img.onerror = () => imageCache.set(imgSrc, false);
        img.src = imgSrc;
      }
    });
  });
}

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

function showModal(product) {
  renderProductModal(product);
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  tg?.expand();
}

window.closeModal = function() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  selectedOption = {};
  currentProduct = null;
  tg?.HapticFeedback?.impactOccurred('light');
};

initApp();

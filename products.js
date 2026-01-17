const PLACEHOLDERS = {
  'iPhone': 'https://via.placeholder.com/300x300/007AFF/FFFFFF?text=iPhone',
  'iPad': 'https://via.placeholder.com/300x300/34C759/FFFFFF?text=iPad',
  'MacBook': 'https://via.placeholder.com/300x300/FFD60A/000000?text=MacBook',
  'Apple Watch': 'https://via.placeholder.com/300x300/AF52DE/FFFFFF?text=Watch',
  'AirPods': 'https://via.placeholder.com/300x300/30D158/FFFFFF?text=AirPods'
};

const FILTER_ORDER = ['simType', 'storage', 'color', 'region'];

function normalizeProducts(products) {
  return products.flatMap(product =>
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
      inStock: !!variant.inStock,
      commonImage: product.commonImage || '',
      images: Array.isArray(variant.images) ? variant.images : []
    }))
  );
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

function getLabel(type) {
  const labels = { simType: 'SIM/eSIM', storage: 'Память', color: 'Цвет', region: 'Регион' };
  return labels[type] || type;
}

// Рендер магазина
function renderShop() {
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

  const commonImage = variants[0]?.commonImage || product.commonImage || '';
  const fallbackByCategory = PLACEHOLDERS[product.cat] || PLACEHOLDERS['iPhone'];

  const images = allImages.length > 0
    ? allImages.slice(0, 3)
    : [commonImage || fallbackByCategory];

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
      renderShop();
    };
  }

  if (searchEl) {
    searchEl.oninput = function(e) {
      query = e.target.value || '';
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        loadedCount = 10;
        renderShop();
      }, 500);
    };
  }

  document.querySelectorAll('[data-product-name]').forEach(card => {
    card.addEventListener('click', function(e) {
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

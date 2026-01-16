function getLabel(type) {
    const labels = { simType: 'SIM/eSIM', storage: 'Память', color: 'Цвет', region: 'Регион' };
    return labels[type] || type;
}

function render() {
    if (!productsData || productsData.length === 0) {
        root.innerHTML = '<div class="text-center p-20 text-gray-500">Нет товаров</div>';
        return;
    }

    const list = getVisibleProducts();
    const showCount = Math.min(loadedCount, list.length);

    root.innerHTML = `
        <div class="mb-5">
            <h1 class="text-3xl font-bold text-center mb-4">Магазин</h1>
            <div class="flex items-center gap-3">
                <div class="flex-1 bg-white rounded-2xl shadow px-3 py-2">
                    <label class="text-xs text-gray-500 block mb-1">Категория</label>
                    <select id="category" class="w-full bg-transparent border-none font-semibold text-base focus:outline-none appearance-none">
                        ${CATEGORIES.map(c => `<option value="${c}" ${selectedCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="w-44 bg-white rounded-2xl shadow px-3 py-2">
                    <label class="text-xs text-gray-500 block mb-1">Поиск</label>
                    <div class="flex items-center">
                        <svg class="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                        </svg>
                        <input id="search" value="${escapeHtml(query)}" placeholder="Поиск..." class="w-full bg-transparent outline-none text-sm text-gray-900"/>
                    </div>
                </div>
            </div>
            <div class="mt-3 text-xs text-gray-500">
                <span class="font-semibold">${showCount}</span> / ${list.length}
            </div>
        </div>
        <div class="product-grid" id="productGrid">
            ${list.slice(0, showCount).map(productCard).join('')}
        </div>
    `;
    
    setupHandlers();
    preloadAllImages(list.slice(0, showCount));
    setupImageCarousels();
}

function productCard(product) {
    const variants = getProductVariants(product.name);
    const allImages = getFilteredProductImages(variants);
    const images = allImages.length > 0 ? allImages.slice(0, 3) : [PLACEHOLDERS[product.cat] || PLACEHOLDERS.iPhone];
    const cheapestVariant = variants.reduce((min, p) => p.price < min.price ? p : min, variants[0]);
    const carouselId = 'carousel_' + Math.random().toString(36).substr(2, 9);

    return `
        <div class="bg-white rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-all group cursor-pointer relative" 
             data-product-name="${escapeHtml(product.name)}" data-carousel-id="${carouselId}">
            <div class="w-full h-32 rounded-xl mb-3 image-carousel h-32 group-hover:scale-105 transition-transform cursor-pointer" onclick="openProductFullscreen('${carouselId}')">
                <div class="image-carousel-inner" data-carousel="${carouselId}" data-current="0">
                    ${images.map((img, idx) => `<img src="${img}" class="carousel-img ${idx===0?'loaded':''}" alt="${product.name}" loading="lazy"/>`).join('')}
                </div>
                ${images.length > 1 ? `
                    <button class="nav-btn nav-prev" onclick="carouselPrev('${carouselId}'); event.stopPropagation()">‹</button>
                    <button class="nav-btn nav-next" onclick="carouselNext('${carouselId}'); event.stopPropagation()">›</button>
                    <div class="carousel-dots">
                        ${images.map((_, idx) => `<div class="dot ${idx===0?'active':''}" onclick="carouselGoTo('${carouselId}', ${idx}); event.stopPropagation()"></div>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="font-bold text-base mb-1 truncate">${escapeHtml(product.name)}</div>
            <div class="text-blue-600 font-black text-xl mb-1">${cheapestVariant.price.toLocaleString()}</div>
            <div class="text-xs text-gray-500 mb-4">${variants.length} вариантов</div>
        </div>
    `;
}

function setupHandlers() {
    const categoryEl = document.getElementById('category');
    const searchEl = document.getElementById('search');
    
    if (categoryEl) {
        categoryEl.onchange = e => {
            selectedCategory = e.target.value;
            loadedCount = 10;
            if (selectedCategory) randomIds = pickRandomIds(productsData, 20);
            render();
        };
    }
    
    if (searchEl) {
        searchEl.oninput = e => {
            query = e.target.value;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadedCount = 10;
                render();
            }, 500);
        };
    }
    
    document.querySelectorAll('[data-product-name]').forEach(card => {
        card.onclick = e => {
            if (e.target.closest('button') || e.target.closest('.dot')) return;
            const productName = card.dataset.productName;
            const product = productsData.find(p => p.name === productName);
            if (product) {
                selectedOption = {};
                showModal(product);
                tg?.HapticFeedback?.impactOccurred('medium');
            }
        };
    });
}

function setupImageCarousels() {
    document.querySelectorAll('.image-carousel[data-carousel]').forEach(carousel => {
        const inner = carousel.querySelector('.image-carousel-inner');
        const dots = carousel.querySelectorAll('.dot');
        const carouselId = inner.dataset.carousel;
        let currentIndex = 0;

        function updateCarousel() {
            inner.style.transform = `translateX(-${currentIndex * 100}%)`;
            dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
        }

        window[`carouselNext_${carouselId}`] = () => {
            currentIndex = (currentIndex + 1) % inner.children.length;
            updateCarousel();
            tg?.HapticFeedback?.selectionChanged();
        };

        window[`carouselPrev_${carouselId}`] = () => {
            currentIndex = currentIndex === 0 ? inner.children.length - 1 : currentIndex - 1;
            updateCarousel();
            tg?.HapticFeedback?.selectionChanged();
        };

        window[`carouselGoTo_${carouselId}`] = index => {
            currentIndex = index;
            updateCarousel();
            tg?.HapticFeedback?.selectionChanged();
        };

        dots.forEach((dot, idx) => {
            dot.onclick = () => {
                currentIndex = idx;
                updateCarousel();
                tg?.HapticFeedback?.selectionChanged();
            };
        });

        updateCarousel();
    });
}

function openProductFullscreen(carouselId) {
    const carousel = document.querySelector(`[data-carousel="${carouselId}"] .image-carousel-inner`);
    if (!carousel) return;
    const images = Array.from(carousel.querySelectorAll('.carousel-img')).map(img => img.src);
    openFullscreen(images, 0);
}

function showCartTab() {
    root.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div class="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">
                <svg class="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Корзина</h2>
            <p class="text-lg text-gray-600 mb-8"><span class="font-bold text-blue-600">${cartCount}</span> товаров</p>
            <div class="space-y-3 w-full max-w-sm">
                <button onclick="addToCart()" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all">Добавить в корзину</button>
                <button class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all">Оформить</button>
            </div>
        </div>
    `;
}

function showSaleTab() {
    root.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div class="w-24 h-24 bg-orange-100 rounded-3xl flex items-center justify-center mb-6">
                <svg class="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Скидки до 70%!</h2>
            <p class="text-lg text-gray-600 mb-8">Скоро здесь будут акции</p>
            <button onclick="switchTab('shop')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all">В магазин</button>
        </div>
    `;
}

function showProfileTab() {
    root.innerHTML = `
        <div class="p-6 space-y-6">
            <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                </div>
                <div>
                    <h2 class="text-xl font-bold">${tg?.initDataUnsafe?.user?.first_name || 'Пользователь'}</h2>
                    <p class="text-gray-500">ID: ${tg?.initDataUnsafe?.user?.id || 'N/A'}</p>
                </div>
            </div>
            <div class="space-y-3">
                <button class="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-all flex items-center">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Настройки
                </button>
                <button class="w-full bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 px-4 rounded-xl transition-all flex items-center">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Выйти
                </button>
            </div>
        </div>
    `;
}

function showAboutTab() {
    root.innerHTML = `
        <div class="p-6 space-y-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">О нас</h2>
            <div class="space-y-4 text-gray-700">
                <p>Apple Store Bot</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-8">
                <div class="text-center p-4 bg-blue-50 rounded-xl">
                    <div class="text-2xl font-bold text-blue-600">1000+</div>
                    <div class="text-sm text-gray-600">товаров</div>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-xl">
                    <div class="text-2xl font-bold text-green-600">24/7</div>
                    <div class="text-sm text-gray-600">поддержка</div>
                </div>
            </div>
        </div>
    `;
}

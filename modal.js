function getProductVariants(productName) {
    return productsData ? productsData.filter(p => p.name === productName) : [];
}

function getFilteredProductImages(variants) {
    const images = new Set();
    variants.forEach(variant => {
        if (variant.images && Array.isArray(variant.images)) {
            variant.images.forEach(img => {
                if (img) images.add(img.trim());
            });
        }
    });
    return Array.from(images);
}

function getFilteredVariants(variants) {
    return variants.filter(variant => 
        FILTER_ORDER.every(type => {
            const selectedValue = selectedOption[type];
            return !selectedValue || variant[type] === selectedValue;
        })
    );
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

function showModal(product) {
    renderProductModal(product);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    tg?.expand();
}

window.closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    selectedOption = {};
    currentProduct = null;
    tg?.HapticFeedback?.impactOccurred('light');
};

let modalImageIndexBeforeFullscreen = 0;

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

    document.getElementById('modalContent').innerHTML = `
        <div class="flex flex-col h-full max-h-[90vh]">
            <div class="p-6 pb-4 border-b border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-2xl font-bold">${escapeHtml(product.name)}</h2>
                    <button onclick="closeModal()" class="p-2 hover:bg-gray-100 rounded-xl">
                        <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                    <span>${Math.min(filteredVariants.length, 10)} вариантов</span>
                    ${variants.map(v => `$${v.price}`).join(', ')}
                </div>
            </div>
            
            <div class="flex-1 overflow-hidden">
                <div class="modal-image-section">
                    <div class="w-full h-64 image-carousel h-64 rounded-xl overflow-hidden cursor-pointer mb-6" id="modalCarousel" 
                         ${complete && filteredImages.length > 0 ? `onclick="openFullscreenModal()"` : 'style="cursor: default"'}>
                        ${complete && filteredImages.length > 0 ? `
                            <div class="image-carousel-inner" id="modalCarouselInner">
                                ${filteredImages.slice(0, 10).map(img => `<img src="${img}" class="carousel-img loaded" alt="${product.name}" loading="lazy"/>`).join('')}
                            </div>
                            ${filteredImages.length > 1 ? `
                                <button class="nav-btn nav-prev" onclick="modalPrev(); event.stopPropagation()">‹</button>
                                <button class="nav-btn nav-next" onclick="modalNext(); event.stopPropagation()">›</button>
                                <div class="carousel-dots" id="modalDots">
                                    ${Array(filteredImages.length).fill().map((_, idx) => 
                                        `<div class="dot ${idx === modalImageIndexBeforeFullscreen ? 'active' : ''}" onclick="modalGoTo(${idx}); event.stopPropagation()"></div>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        ` : `
                            <div class="no-images h-64">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                <div class="text-center text-sm font-medium">Выберите все опции</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <div class="p-6 space-y-4 overflow-y-auto max-h-80">
                ${FILTER_ORDER.map((type, index) => {
                    const isLocked = index < getCurrentSectionIndex();
                    return `
                        <div class="option-section ${isLocked ? 'locked' : 'unlocked'}" data-section="${type}">
                            <label class="text-sm font-semibold text-gray-700 capitalize mb-2 block">${getLabel(type)}</label>
                            <div class="flex gap-2 scroll-carousel pb-1">
                                ${availableOptions[type].map(option => `
                                    <button class="option-btn px-3 py-1.5 text-xs font-medium rounded-full border scroll-item w-[80px] 
                                        ${selectedOption[type] === option ? 'bg-blue-500 text-white border-blue-500 shadow-md font-bold' : 
                                        'bg-gray-100 border-gray-300 hover:bg-gray-200'} transition-all" 
                                        data-type="${type}" data-option="${escapeHtml(option)}" 
                                        onclick="selectOptionNoFocus('${type}', '${escapeHtml(option)}'); return false;">
                                        ${escapeHtml(option)}
                                    </button>
                                `).join('')}
                                ${selectedOption[type] ? `
                                    <button onclick="clearOptionNoFocus('${type}'); return false;" 
                                            class="px-3 py-1.5 text-xs text-red-500 font-medium rounded-full border border-red-200 hover:bg-red-50 scroll-item w-12">
                                        ×
                                    </button>
                                ` : ''}
                            </div>
                            ${!availableOptions[type].length ? '<p class="text-xs text-gray-400 mt-1">Нет вариантов</p>' : ''}
                        </div>
                    `;
                }).join('')}
                
                <div class="pt-4 border-t">
                    <div class="text-center text-sm text-gray-500 mb-4">
                        <span id="variantCount" class="font-bold text-blue-600">${filteredVariants.length}</span> вариантов
                        ${complete && filteredVariants.length === 1 ? `
                            <div class="text-xs mt-1 bg-blue-50 border border-blue-200 rounded-xl p-2">
                                ${filteredVariants[0].storage} | ${filteredVariants[0].color} | ${filteredVariants[0].region}
                            </div>
                        ` : ''}
                    </div>
                    <button onclick="addToCartFromModal()" 
                            class="w-full ${complete && filteredVariants.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} 
                            text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-lg transform hover:-translate-y-0.5 transition-all 
                            ${!(complete && filteredVariants.length > 0) ? 'disabled' : ''}">
                        ${complete && filteredVariants.length > 0 ? `$${filteredVariants[0]?.price || 0}` : 'Выберите опции'}
                    </button>
                </div>
            </div>
        </div>
    `;

    if (complete && filteredImages.length > 0) {
        modalCurrentIndex = modalImageIndexBeforeFullscreen;
        initModalCarousel(filteredImages.length);
    }
}

function selectOptionNoFocus(type, option) {
    document.activeElement?.blur();
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

window.clearOptionNoFocus = clearOptionNoFocus;
function clearOptionNoFocus(type) {
    document.activeElement?.blur();
    const typeIndex = FILTER_ORDER.indexOf(type);
    for (let i = typeIndex; i < FILTER_ORDER.length; i++) {
        delete selectedOption[FILTER_ORDER[i]];
    }
    renderProductModal(currentProduct);
    tg?.HapticFeedback?.impactOccurred('light');
}

window.addToCartFromModal = function() {
    if (!isCompleteSelection()) {
        tg?.showAlert('Выберите SIM!');
        return;
    }
    const variants = getFilteredVariants(getProductVariants(currentProduct.name));
    if (variants.length === 0) {
        tg?.showAlert('Нет таких вариантов!');
        return;
    }
    const selectedVariant = variants[0];
    addToCart();
    tg?.showAlert(`${selectedVariant.name}: ${selectedVariant.storage} ${selectedVariant.color} ${selectedVariant.region} - $${selectedVariant.price}`);
    closeModal();
};

window.selectOptionNoFocus = selectOptionNoFocus;

// Modal Carousel
function initModalCarousel(imageCount) {
    if (imageCount <= 1) return;
    modalImageCount = imageCount;
    const inner = document.getElementById('modalCarouselInner');
    if (!inner) return;

    function updateModalCarousel() {
        inner.style.transform = `translateX(-${modalCurrentIndex * 100}%)`;
        document.querySelectorAll('#modalDots .dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx === modalCurrentIndex);
        });
    }

    window.modalNext = () => {
        modalCurrentIndex = (modalCurrentIndex + 1) % modalImageCount;
        updateModalCarousel();
        tg?.HapticFeedback?.selectionChanged();
    };

    window.modalPrev = () => {
        modalCurrentIndex = modalCurrentIndex === 0 ? modalImageCount - 1 : modalCurrentIndex - 1;
        updateModalCarousel();
        tg?.HapticFeedback?.selectionChanged();
    };

    window.modalGoTo = i => {
        modalCurrentIndex = i;
        updateModalCarousel();
        tg?.HapticFeedback?.selectionChanged();
    };

    updateModalCarousel();
}

window.openFullscreenModal = () => {
    const images = Array.from(document.querySelectorAll('#modalCarouselInner .carousel-img')).map(img => img.src);
    openFullscreen(images, modalCurrentIndex);
};

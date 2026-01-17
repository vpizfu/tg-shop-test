let modalCurrentIndex = 0;
let modalImageCount = 0;
let modalImageIndexBeforeFullscreen = 0;

function selectOptionNoFocus(type, option) {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  const scrollContainer = document.querySelector('#modalContent .flex-1');
  const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

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

  const newScrollContainer = document.querySelector('#modalContent .flex-1');
  if (newScrollContainer) newScrollContainer.scrollTop = prevScrollTop;

  tg?.HapticFeedback?.impactOccurred('light');
}

function clearOptionNoFocus(type) {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  const scrollContainer = document.querySelector('#modalContent .flex-1');
  const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  const typeIndex = FILTER_ORDER.indexOf(type);
  for (let i = typeIndex; i < FILTER_ORDER.length; i++) {
    delete selectedOption[FILTER_ORDER[i]];
  }

  renderProductModal(currentProduct);

  const newScrollContainer = document.querySelector('#modalContent .flex-1');
  if (newScrollContainer) newScrollContainer.scrollTop = prevScrollTop;

  tg?.HapticFeedback?.impactOccurred('light');
}

window.selectOptionNoFocus = selectOptionNoFocus;
window.clearOptionNoFocus = clearOptionNoFocus;

window.addToCartFromModal = function() {
  if (!isCompleteSelection()) {
    tg?.showAlert?.('❌ Выберите все опции: SIM → Память → Цвет → Регион');
    return;
  }

  const allVariants = getFilteredVariants(
    getProductVariants(currentProduct.name).filter(v => v.inStock)
  );
  const variants = allVariants; // уже только ✅

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

  // все варианты товара
  const allVariants = getProductVariants(product.name);
  // только доступные варианты (✅)
  const variants = allVariants.filter(v => v.inStock);

  if (variants.length === 0) {
    document.getElementById('modalContent').innerHTML =
      '<div class="flex flex-col h-full">' +
        '<div class="p-6 pb-4 border-b border-gray-200">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<h2 class="text-2xl font-bold">' + escapeHtml(product.name) + '</h2>' +
            '<button onclick="closeModal()" class="p-2 hover:bg-gray-100 rounded-xl">' +
              '<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<div class="text-sm text-red-500">Нет доступных вариантов</div>' +
        '</div>' +
      '</div>';
    return;
  }

  const filteredVariants = getFilteredVariants(variants);
  const availableOptions = {};

  FILTER_ORDER.forEach(type => {
    availableOptions[type] = getAvailableOptions(type, variants);
  });

  const complete = isCompleteSelection();

  const availableVariants = filteredVariants; // здесь уже только inStock

  let filteredImages = [];
  if (complete && availableVariants.length > 0) {
    filteredImages = getFilteredProductImages(availableVariants);
    if (filteredImages.length === 0 && variants[0].commonImage) {
      filteredImages = [variants[0].commonImage];
    }
  }

  const productCommonImage = variants[0].commonImage || product.commonImage || '';

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
          '<div class="w-full h-64 image-carousel h-64 rounded-xl overflow-hidden mb-6" id="modalCarousel">' +
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
              : (productCommonImage
                  ? '<div class="w-full h-64 rounded-xl overflow-hidden mb-6">' +
                      '<img src="' + productCommonImage + '" class="w-full h-full object-cover" alt="Product image" />' +
                    '</div>'
                  : '<div class="no-images h-64">' +
                      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                              ' d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
                      '</svg>' +
                      '<div class="text-center text-sm font-medium">Выберите все параметры для просмотра фото</div>' +
                    '</div>'
                )
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
                availableVariants.length +
              '</span> вариантов' +
              (complete && availableVariants.length === 1
                ? '<div class="text-xs mt-1 bg-blue-50 border border-blue-200 rounded-xl p-2">' +
                    '✅ Выбран: ' + availableVariants[0].storage + ' | ' +
                                   availableVariants[0].color + ' | ' +
                                   availableVariants[0].region +
                  '</div>'
                : ''
              ) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-footer border-t bg-white">' +
        '<button onclick="addToCartFromModal()"' +
                ' class="w-full ' +
                  (complete && availableVariants.length > 0
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-400 cursor-not-allowed') +
                  ' text-white font-semibold px-4 rounded-2xl shadow-lg transition-all"' +
                (complete && availableVariants.length > 0 ? '' : ' disabled') +
                '>' +
          (complete && availableVariants.length > 0
            ? '✅ В корзину $' + (availableVariants[0] && availableVariants[0].price ? availableVariants[0].price : '')
            : 'Выберите все опции') +
        '</button>' +
      '</div>' +
    '</div>';

  if (complete && filteredImages.length > 0) {
    modalCurrentIndex = modalImageIndexBeforeFullscreen;
    initModalCarousel(filteredImages.length);
  }
}

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

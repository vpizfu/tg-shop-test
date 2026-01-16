function getVisibleProducts() {
    if (!productsData) return [];
    let base = selectedCategory ? 
        productsData.filter(p => randomIds.includes(p.id)) : 
        productsData.filter(p => p.cat === selectedCategory);
    
    const grouped = {};
    base.forEach(p => {
        if (!grouped[p.name]) grouped[p.name] = { price: p.price, items: [] };
        grouped[p.name].price = Math.min(grouped[p.name].price, p.price);
        grouped[p.name].items.push(p);
    });
    
    if (query.trim()) {
        const q = query.trim().toLowerCase();
        return Object.values(grouped).filter(p => 
            p.name?.toLowerCase().includes(q) || 
            p.cat?.toLowerCase().includes(q)
        );
    }
    
    return Object.values(grouped);
}

function pickRandomIds(items, count) {
    const ids = items.map(x => x.id);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, Math.min(count, ids.length));
}

function preloadAllImages(products) {
    products.forEach(product => {
        const variants = getProductVariants(product.name);
        const allImages = getFilteredProductImages(variants);
        allImages.forEach(imgSrc => {
            if (!imageCache.has(imgSrc)) {
                const img = new Image();
                img.onload = () => imageCache.set(imgSrc, true);
                img.onerror = () => imageCache.set(imgSrc, false);
                img.src = imgSrc;
            }
        });
    });
}

// Fullscreen Functions
function openFullscreen(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    
    fullscreenImages = images;
    fullscreenCurrentIndex = startIndex;
    updateFullscreenCarousel();
    fullscreenModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    tg?.expand();
    
    // Фикс: отключаем скролл если 1 изображение
    const container = document.getElementById('fullscreenCarousel');
    if (images.length === 1) {
        container.parentElement.classList.add('single-image');
    } else {
        container.parentElement.classList.remove('single-image');
    }
}

window.fullscreenNext = () => {
    fullscreenCurrentIndex = (fullscreenCurrentIndex + 1) % fullscreenImages.length;
    updateFullscreenCarousel();
    tg?.HapticFeedback?.selectionChanged();
};

window.fullscreenPrev = () => {
    fullscreenCurrentIndex = fullscreenCurrentIndex === 0 ? fullscreenImages.length - 1 : fullscreenCurrentIndex - 1;
    updateFullscreenCarousel();
    tg?.HapticFeedback?.selectionChanged();
};

window.closeFullscreen = () => {
    fullscreenModal.classList.remove('active');
    document.body.style.overflow = '';
};

function updateFullscreenCarousel() {
    const container = document.getElementById('fullscreenCarousel');
    container.innerHTML = `
        <div class="flex items-center justify-center w-full h-full" style="transform: translateX(-${fullscreenCurrentIndex * 100}%)">
            ${fullscreenImages.map((img, idx) => 
                `<img src="${img}" class="carousel-img ${idx === fullscreenCurrentIndex ? 'loaded' : ''}" alt="Fullscreen image ${idx + 1}" loading="lazy"/>`
            ).join('')}
        </div>
    `;
}

// Глобальные carousel функции (для старых вызовов)
window.carouselNext = id => window[`carouselNext_${id}`]?.();
window.carouselPrev = id => window[`carouselPrev_${id}`]?.();
window.carouselGoTo = (id, index) => window[`carouselGoTo_${id}`]?.(index);

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.MainButton.setText('Корзина (0)').hide();

let products = [
    {id:1, name:'iPhone 15 Pro', price:1200, img:'https://via.placeholder.com/150?text=iPhone', cat:'iPhone'},
    {id:2, name:'iPhone 14', price:900, img:'https://via.placeholder.com/150?text=iPhone', cat:'iPhone'},
    {id:3, name:'iPad Air', price:700, img:'https://via.placeholder.com/150?text=iPad', cat:'iPad'},
    {id:4, name:'iPad Pro', price:1100, img:'https://via.placeholder.com/150?text=iPad', cat:'iPad'}
];

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let addresses = JSON.parse(localStorage.getItem('addresses') || '[]') || ['Минск, ул. Ленина 1'];
let orders = JSON.parse(localStorage.getItem('orders') || '[]');
let userId = tg.initDataUnsafe?.user?.id || 'test';

const root = document.getElementById('root');
let currentScreen = 'home';

function render() {
    switch (currentScreen) {
        case 'home': renderHome(); break;
        case 'cart': renderCart(); break;
        case 'profile': renderProfile(); break;
        case 'order': renderOrder(); break;
    }
    updateMainButton();
}

function renderHome() {
    const filtered = products.filter(p => {
        const search = searchInput.value.toLowerCase();
        const cat = categorySelect.value;
        return p.name.toLowerCase().includes(search) && (!cat || p.cat === cat);
    });
    root.innerHTML = `
        <div class="mb-4">
            <input id="searchInput" placeholder="Поиск..." class="w-full p-3 border rounded-lg mb-3 bg-white">
            <select id="categorySelect" class="w-full p-3 border rounded-lg bg-white">
                <option value="">Все категории</option>
                <option value="iPhone">iPhone</option>
                <option value="iPad">iPad</option>
            </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
            ${filtered.map(p => `
                <div class="bg-white p-3 rounded-lg shadow">
                    <img src="${p.img}" class="w-full h-32 object-cover rounded mb-2">
                    <h3 class="font-bold">${p.name}</h3>
                    <p class="text-xl text-blue-600">$${p.price}</p>
                    <button onclick="addToCart(${p.id})" class="w-full bg-blue-500 text-white py-2 rounded mt-2">В корзину</button>
                </div>
            `).join('')}
        </div>
        <div class="mt-6 text-center">
            <button onclick="showScreen('cart')" class="bg-green-500 text-white px-6 py-2 rounded">Корзина</button>
            <button onclick="showScreen('profile')" class="bg-gray-500 text-white px-6 py-2 rounded ml-2">Профиль</button>
        </div>
    `;
    document.getElementById('searchInput').addEventListener('input', renderHome);
    document.getElementById('categorySelect').addEventListener('change', renderHome);
}

function renderCart() {
    const total = cart.reduce((sum, item) => sum + products.find(p => p.id === item.id).price * item.qty, 0);
    root.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Корзина (${cart.length})</h2>
        ${cart.map(item => {
            const p = products.find(pr => pr.id === item.id);
            return `
                <div class="flex justify-between items-center bg-white p-3 rounded-lg mb-2">
                    <div>
                        <h3>${p.name}</h3>
                        <p>$${p.price} x ${item.qty}</p>
                    </div>
                    <div>
                        <button onclick="changeQty(${item.id}, -1)" class="bg-red-500 text-white px-2 py-1 rounded">-</button>
                        <span class="mx-2">${item.qty}</span>
                        <button onclick="changeQty(${item.id}, 1)" class="bg-green-500 text-white px-2 py-1 rounded">+</button>
                    </div>
                </div>
            `;
        }).join('')}
        <div class="text-xl font-bold mt-4">Итого: $${total}</div>
        <button onclick="showScreen('order')" class="w-full bg-blue-500 text-white py-3 rounded-lg mt-4 font-bold">Оформить заказ</button>
        <button onclick="showScreen('home')" class="w-full bg-gray-500 text-white py-2 rounded mt-2">На главную</button>
    `;
}

function renderProfile() {
    root.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Профиль</h2>
        <div class="mb-6">
            <h3 class="font-bold mb-2">Адреса доставки</h3>
            ${addresses.map((addr, i) => `<div class="bg-white p-3 rounded mb-2">${addr} <button onclick="editAddress(${i})" class="text-blue-500">Изменить</button></div>`).join('')}
            <input id="newAddr" placeholder="Новый адрес" class="w-full p-2 border rounded mt-2">
            <button onclick="addAddress()" class="w-full bg-green-500 text-white py-2 rounded mt-2">Добавить</button>
        </div>
        <div>
            <h3 class="font-bold mb-2">Заказы</h3>
            ${orders.map(o => `<div class="bg-white p-3 rounded mb-2"><pre>${JSON.stringify(o, null, 2)}</pre></div>`).join('')}
        </div>
        <button onclick="showScreen('home')" class="w-full bg-gray-500 text-white py-2 rounded mt-4">На главную</button>
    `;
}

function renderOrder() {
    const total = cart.reduce((sum, item) => sum + products.find(p => p.id === item.id).price * item.qty, 0);
    root.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Оформить заказ</h2>
        <div class="bg-white p-4 rounded-lg mb-4">
            <p>Сумма: $${total}</p>
            <select id="orderAddr" class="w-full p-3 border rounded mt-3">
                ${addresses.map(addr => `<option>${addr}</option>`).join('')}
            </select>
        </div>
        <button id="confirmOrder" class="w-full bg-green-500 text-white py-3 rounded-lg font-bold">Подтвердить</button>
        <button onclick="showScreen('cart')" class="w-full bg-gray-500 text-white py-2 rounded mt-2">Назад</button>
    `;
    document.getElementById('confirmOrder').onclick = confirmOrder;
}

function addToCart(id) {
    const item = cart.find(i => i.id === id);
    if (item) item.qty++; else cart.push({id, qty:1});
    saveCart();
    tg.HapticFeedback.impactOccurred('light');
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart();
        render();
    }
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function addAddress() {
    const addr = document.getElementById('newAddr').value;
    if (addr) { addresses.push(addr); localStorage.setItem('addresses', JSON.stringify(addresses)); render(); }
}
function editAddress(i) { /* Простая логика редактирования */ }
function confirmOrder() {
    const order = {id: Date.now(), userId, cart, address: document.getElementById('orderAddr').value, date: new Date().toISOString()};
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    tg.sendData(JSON.stringify(order));
    cart = [];
    saveCart();
    tg.showAlert('Заказ отправлен боту!');
    showScreen('profile');
}

function showScreen(screen) { currentScreen = screen; render(); }
function updateMainButton() {
    const count = cart.length;
    tg.MainButton.setText(`Корзина (${count})`).setEnabled(count > 0).show();
    tg.MainButton.onClick(() => showScreen('cart'));
}

render();  // Старт


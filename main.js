// Menu
let menu = document.querySelector('.menu-icon');
let navbar = document.querySelector('.navbar');

if (menu) {
    menu.onclick = () => {
        menu.classList.toggle("move");
        navbar.classList.toggle("open-menu");
    };
}

// Close Menu On Scroll
window.onscroll = () => {
    if (menu) menu.classList.remove("move");
    if (navbar) navbar.classList.remove("open-menu");
};

// Scroll Reveal
const animate = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: '2500',
    delay: '400', 
});

animate.reveal(".home-text",{origin: "left"});
animate.reveal(".home-img",{origin: "right"});
animate.reveal(".heading, .newsletter h2",{origin: "top"});
animate.reveal("header, .feature-box, .feature-menu-box, .item-box, .m-item-box, .t-box, .newsletter form",{interval: 100});

// Product Detail Modal & Add-to-Cart
const modal = document.getElementById('product-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalPrice = document.getElementById('modal-price');
const modalImage = document.getElementById('modal-image');
const modalSizesContainer = document.getElementById('modal-sizes');
const qtyInput = document.getElementById('qty-input');
const qtyInc = document.getElementById('qty-increase');
const qtyDec = document.getElementById('qty-decrease');
const addToCartBtn = document.getElementById('add-to-cart');
const cartCountElem = document.querySelector('.cart span');

let cartCount = cartCountElem ? (parseInt(cartCountElem.textContent) || 0) : 0;

// Tracking pointer to remember pristine baseline large prices during active lifecycle ops
let activeProductBaseLargePrice = 0;

function openProductModal(data){
    if (!modalTitle) return;
    modalTitle.textContent = data.name || 'Product';
    modalDesc.textContent = data.description || `Delicious ${data.name}.`;
    modalImage.src = data.image || 'images/home.png';
    
    // Lock the baseline trace right here to our parsed largePrice parameter
    const largePrice = (typeof data.largePrice === 'number' && !isNaN(data.largePrice)) ? data.largePrice : 0;
    activeProductBaseLargePrice = largePrice;

    // Size discounts applied strictly from the discount base price
    const MEDIUM_DISCOUNT = 0.20; // medium is 20% lower than large
    const SMALL_DISCOUNT = 0.10; // small is 10% lower than medium
    const mediumPrice = +(largePrice * (1 - MEDIUM_DISCOUNT));
    const smallPrice = +(mediumPrice * (1 - SMALL_DISCOUNT));
    
    modalSizesContainer.innerHTML = '';
    const sizes = data.sizes && data.sizes.length ? data.sizes : ['Small','Medium','Large'];
    sizes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        
        // Auto-detect the saved size preference if arriving via the edit pipeline
        const editIdx = localStorage.getItem('editing_cart_index');
        let defaultSelected = s.toLowerCase() === 'large';
        if (editIdx !== null && data.selectedSize) {
            defaultSelected = s.toLowerCase() === data.selectedSize.toLowerCase();
        }

        btn.className = 'size-option' + (defaultSelected ? ' selected' : '');
        btn.textContent = s;
        btn.dataset.size = s;
        
        let priceForSize = largePrice;
        if(s.toLowerCase() === 'medium') priceForSize = mediumPrice;
        if(s.toLowerCase() === 'small') priceForSize = smallPrice;
        btn.dataset.price = priceForSize;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(n => n.classList.remove('selected'));
            btn.classList.add('selected');
            modalPrice.textContent = formatCurrency(btn.dataset.price);
        });
        modalSizesContainer.appendChild(btn);
        
        if(defaultSelected){
            modalPrice.textContent = formatCurrency(priceForSize);
        }
    });
    
    if (qtyInput) qtyInput.value = data.qty || 1;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
}

function formatCurrency(v){
    const n = Number(v) || 0;
    return `$${n.toFixed(2)}`;
}

function closeModal(){
    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
    }
}

document.querySelectorAll('.item-box, .m-item-box').forEach(el=>{
    el.addEventListener('click', (e)=>{
        e.preventDefault();
        
        let name = el.querySelector('h2') ? el.querySelector('h2').textContent.trim() : (el.querySelector('.m-item-des h3') ? el.querySelector('.m-item-des h3').textContent.trim() : 'Product');
        
        // TARGET LOGIC FIX: Target the discount heading (h3) explicitly inside the price container
        let targetHeading = el.querySelector('.price h3, .m-item-price h3');
        let priceText = targetHeading ? targetHeading.textContent.trim() : '';
        
        let descElem = el.querySelector('.m-item-des p');
        let description = descElem ? descElem.textContent.trim() : `Delicious ${name} made with fresh ingredients.`;
        const imgElem = el.querySelector('img');
        const image = imgElem ? imgElem.src : 'images/home.png';
        
        // Extract the correct numeric value from the discount string (e.g. "From $8.99" -> 8.99)
        const digits = (priceText.match(/[0-9]+(?:[.,][0-9]+)?/g) || []).map(s=>parseFloat(s.replace(/,/g,''))).filter(n=>!isNaN(n));
        let largePrice = digits.length ? digits[0] : 0; 

        const pendingEdit = localStorage.getItem('trigger_edit_modal');
        if (pendingEdit) {
            const editData = JSON.parse(pendingEdit);
            if (editData.name === name) {
                largePrice = parseFloat(editData.baseLargePrice) || largePrice;
                priceText = `$${largePrice.toFixed(2)}`;
            }
        }

        openProductModal({name, price: priceText, description, image, largePrice});
    });
});

if(modalClose) modalClose.addEventListener('click', closeModal);
if(modalOverlay) modalOverlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

if(qtyInc) qtyInc.addEventListener('click', ()=>{ if (qtyInput) qtyInput.value = Math.max(1, Number(qtyInput.value) + 1); });
if(qtyDec) qtyDec.addEventListener('click', ()=>{ if (qtyInput) qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });

function loadCartLocal(){
    try{ return JSON.parse(localStorage.getItem('cart_items')||'[]'); }catch(e){return []}
}

if(addToCartBtn){
    addToCartBtn.addEventListener('click', () => {
        const qty = Math.max(1, parseInt(qtyInput.value) || 1);
        const selectedSize = (document.querySelector('.size-option.selected') || {}).dataset.size || 'Large';
        
        const item = {
            name: modalTitle.textContent,
            price: modalPrice.textContent,
            size: selectedSize,
            qty: qty,
            image: modalImage.src.includes('images/') ? modalImage.src.substring(modalImage.src.indexOf('images/')) : 'images/home.png',
            baseLargePrice: activeProductBaseLargePrice
        };

        let items = [];
        const raw = localStorage.getItem('cart_items');
        if(raw) items = JSON.parse(raw);

        const editIndex = localStorage.getItem('editing_cart_index');

        if (editIndex !== null) {
            items[parseInt(editIndex)] = item;
            localStorage.removeItem('editing_cart_index');
            localStorage.setItem('cart_items', JSON.stringify(items));
            closeModal();
            window.location.href = 'cart.html';
            return; 
        } else {
            const existing = items.find(i => i.name === item.name && i.size === item.size);
            if(existing) existing.qty = (existing.qty || 0) + item.qty; else items.push(item);
        }

        localStorage.setItem('cart_items', JSON.stringify(items));
        
        if(typeof cartCount !== 'undefined') {
            cartCount = items.reduce((s,i)=> s + (i.qty||0), 0);
            if(cartCountElem) cartCountElem.textContent = cartCount;
        }
        
        closeModal();
    });
}

document.addEventListener('DOMContentLoaded', ()=>{
    const items = loadCartLocal();
    cartCount = items.reduce((s,i)=> s + (i.qty||0), 0);
    if(cartCountElem) cartCountElem.textContent = cartCount;
});

// Collapse extra items
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('#items .items-content');
    containers.forEach(container => {
        const items = Array.from(container.querySelectorAll('.item-box'));
        if(!items || items.length <= 4) return;

        items.slice(4).forEach(it => it.style.display = 'none');

        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'items-toggle';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-more';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = 'Show more <i class="bx bx-chevron-down"></i>';
        toggleWrap.appendChild(btn);

        container.appendChild(toggleWrap);

        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            if(!expanded){
                items.slice(4).forEach(it => it.style.display = '');
                btn.setAttribute('aria-expanded','true');
                btn.innerHTML = 'Show less <i class="bx bx-chevron-up"></i>';
            } else {
                items.slice(4).forEach(it => it.style.display = 'none');
                btn.setAttribute('aria-expanded','false');
                btn.innerHTML = 'Show more <i class="bx bx-chevron-down"></i>';
            }
        });
    });
});

// Structural tracking page listener handler triggers
document.addEventListener('DOMContentLoaded', () => {
    const pendingEdit = localStorage.getItem('trigger_edit_modal');
    if (pendingEdit) {
        const itemData = JSON.parse(pendingEdit);
        localStorage.removeItem('trigger_edit_modal'); 
        
        if (typeof openProductModal === 'function') {
            const cartItems = loadCartLocal();
            const editIdx = localStorage.getItem('editing_cart_index');
            if (editIdx !== null && cartItems[editIdx]) {
                itemData.selectedSize = cartItems[editIdx].size;
                itemData.qty = cartItems[editIdx].qty;
            }
            openProductModal(itemData);
        }
    }
});

// Connect the Profile Icon to the Auth Modal Popup
const profileIcon = document.getElementById('profile-icon');
const authModal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const authForm = document.getElementById('authForm');

// 1. Open login popup when clicking the person icon
if (profileIcon) {
    profileIcon.addEventListener('click', function(e) {
        e.preventDefault();
        if (authModal) authModal.style.display = 'flex';
    });
}

// 2. Close login popup when clicking the 'X'
closeAuth?.addEventListener('click', () => {
    if (authModal) authModal.style.display = 'none';
});

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });
}

// 3. Phone Authentication Validation & Backend sync
if (authForm) {
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let isValid = true;
        
        const phoneVal = document.getElementById('authPhone').value.trim();
        const userVal = document.getElementById('authUser').value.trim();
        const passVal = document.getElementById('authPass').value.trim();
        
        const phoneError = document.getElementById('authPhoneError');
        const userError = document.getElementById('authUserError');
        const passError = document.getElementById('authPassError');

        // Phone number layout verification checking rules
        if (phoneVal.length < 8) {
            if (phoneError) phoneError.style.display = 'block';
            isValid = false;
        } else {
            if (phoneError) phoneError.style.display = 'none';
        }

        // Username layout verification checking rules
        if (userVal.length < 4) {
            if (userError) userError.style.display = 'block';
            isValid = false;
        } else {
            if (userError) userError.style.display = 'none';
        }

        // Password layout verification checking rules
        if (passVal.length < 6) {
            if (passError) passError.style.display = 'block';
            isValid = false;
        } else {
            if (passError) passError.style.display = 'none';
        }

        if (isValid) {
            // Dispatches validation records directly to auth endpoint matching cart system
            fetch('http://127.0.0.1:8000/API_folder/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone_number: phoneVal,
                    username: userVal,
                    password: passVal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    alert(data.message);
                    
                    // Match the state keys perfectly so checkout verification finds the items
                    sessionStorage.setItem('userPhone', phoneVal);
                    sessionStorage.setItem('userUsername', userVal);
                    
                    if (authModal) authModal.style.display = 'none';
                    authForm.reset();
                } else {
                    alert("⚠️ Authentication Error: " + data.message);
                }
            })
            .catch(err => {
                console.error("Auth System Error:", err);
                alert("Backend server connection failed during account sync.");
            });
        }
    });
}
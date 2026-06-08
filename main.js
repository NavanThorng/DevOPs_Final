// Menu
let menu = document.querySelector('.menu-icon');
let navbar = document.querySelector('.navbar');

menu.onclick = () => {
    menu.classList.toggle("move");
    navbar.classList.toggle("open-menu");
};

// Close Menu On Scroll
window.onscroll = () => {
    menu.classList.remove("move");
    navbar.classList.remove("open-menu");
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

let cartCount = parseInt(cartCountElem.textContent) || 0;

function openProductModal(data){
    modalTitle.textContent = data.name || 'Product';
    modalDesc.textContent = data.description || `Delicious ${data.name}.`;
    modalImage.src = data.image || 'images/home.png';
    // determine numeric large price (original/large)
    const largePrice = (typeof data.largePrice === 'number' && !isNaN(data.largePrice)) ? data.largePrice : (function(){
        const p = (data.price || '') + '';
        const nums = (p.match(/[0-9]+(?:[.,][0-9]+)?/g) || []).map(s=>parseFloat(s.replace(/,/g,''))).filter(n=>!isNaN(n));
        return nums.length ? Math.max(...nums) : 0;
    })();
    // size discounts
    const MEDIUM_DISCOUNT = 0.20; // medium is 20% lower than large
    const SMALL_DISCOUNT = 0.10; // small is 10% lower than medium
    const mediumPrice = +(largePrice * (1 - MEDIUM_DISCOUNT));
    const smallPrice = +(mediumPrice * (1 - SMALL_DISCOUNT));
    // sizes: array
    modalSizesContainer.innerHTML = '';
    const sizes = data.sizes && data.sizes.length ? data.sizes : ['Small','Medium','Large'];
    sizes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        // default select Large (if present) otherwise last option
        const isLarge = s.toLowerCase() === 'large';
        const defaultSelected = isLarge || (!sizes.some(x=>x.toLowerCase()==='large') && idx === sizes.length-1);
        btn.className = 'size-option' + (defaultSelected ? ' selected' : '');
        btn.textContent = s;
        btn.dataset.size = s;
        // attach computed price for this size
        let priceForSize = largePrice;
        if(s.toLowerCase() === 'medium') priceForSize = mediumPrice;
        if(s.toLowerCase() === 'small') priceForSize = smallPrice;
        btn.dataset.price = priceForSize;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(n => n.classList.remove('selected'));
            btn.classList.add('selected');
            // update displayed price
            modalPrice.textContent = formatCurrency(btn.dataset.price);
        });
        modalSizesContainer.appendChild(btn);
        // if default selected set initial price
        if(defaultSelected){
            modalPrice.textContent = formatCurrency(priceForSize);
        }
    });
    qtyInput.value = 1;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
}

function formatCurrency(v){
    const n = Number(v) || 0;
    return `$${n.toFixed(2)}`;
}

function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
}

document.querySelectorAll('.item-box, .m-item-box').forEach(el=>{
    el.addEventListener('click', (e)=>{
        e.preventDefault();
        // find name and price
        let name = el.querySelector('h2') ? el.querySelector('h2').textContent.trim() : (el.querySelector('.m-item-des h3') ? el.querySelector('.m-item-des h3').textContent.trim() : 'Product');
        let priceElem = el.querySelector('.price') || el.querySelector('.m-item-price') || el;
        let priceText = priceElem ? priceElem.textContent.trim() : '';
        let descElem = el.querySelector('.m-item-des p');
        let description = descElem ? descElem.textContent.trim() : `Delicious ${name} made with fresh ingredients.`;
        const imgElem = el.querySelector('img');
        const image = imgElem ? imgElem.src : 'images/home.png';
        // extract numeric prices and choose the largest as the large/original price
        const matches = (priceText.match(/[0-9]+(?:[.,][0-9]+)?/g) || []).map(s=>parseFloat(s.replace(/,/g,''))).filter(n=>!isNaN(n));
        const largePrice = matches.length ? Math.max(...matches) : (function(){
            // fallback try to parse any price-like string
            const p = (priceText||'').replace(/[^0-9.]/g,'');
            return p ? parseFloat(p) : 0;
        })();
        openProductModal({name, price: priceText, description, image, largePrice});
    });
});

if(modalClose) modalClose.addEventListener('click', closeModal);
if(modalOverlay) modalOverlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

if(qtyInc) qtyInc.addEventListener('click', ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value) + 1); });
if(qtyDec) qtyDec.addEventListener('click', ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });

// (simple handler removed — use persistence handler below)

// Persist cart to localStorage and expose small API
function loadCartLocal(){
    try{ return JSON.parse(localStorage.getItem('cart_items')||'[]'); }catch(e){return []}
}
function saveCartLocal(items){ localStorage.setItem('cart_items', JSON.stringify(items)); }

if(addToCartBtn){
    addToCartBtn.addEventListener('click', ()=>{
        const qty = Math.max(1, parseInt(qtyInput.value) || 1);
        const selectedSize = (document.querySelector('.size-option.selected') || {}).dataset.size || '';
        const item = {
            name: modalTitle.textContent,
            price: modalPrice.textContent,
            size: selectedSize,
            qty: qty,
            image: modalImage.src
        };
        const items = loadCartLocal();
        const existing = items.find(i=> i.name === item.name && i.size === item.size);
        if(existing) existing.qty = (existing.qty||0) + item.qty; else items.push(item);
        saveCartLocal(items);
        // update visual cart count
        cartCount = items.reduce((s,i)=> s + (i.qty||0), 0);
        cartCountElem.textContent = cartCount;
        // also expose to global api for cart page
        if(window.opener && window.opener.__cartApi) window.opener.__cartApi.add(item);
        closeModal();
    });
}

// initialize cart count from localStorage
document.addEventListener('DOMContentLoaded', ()=>{
    const items = loadCartLocal();
    cartCount = items.reduce((s,i)=> s + (i.qty||0), 0);
    if(cartCountElem) cartCountElem.textContent = cartCount;
});

// Collapse extra items (hide items 5-8) in each featured category and add a "Show more" toggle
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('#items .items-content');
    containers.forEach(container => {
        const items = Array.from(container.querySelectorAll('.item-box'));
        if(!items || items.length <= 4) return; // nothing to collapse

        // hide items 5.. by default
        items.slice(4).forEach(it => it.style.display = 'none');

        // create toggle button (will be inserted into the grid so it can span columns)
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'items-toggle';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-more';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = 'Show more <i class="bx bx-chevron-down"></i>';
        toggleWrap.appendChild(btn);

        // insert as the last grid item inside the container so it centers across columns
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

function formatPrice(p){
    // Try to extract number from strings like "From $220.00"
    if(typeof p === 'number') return p;
    if(!p) return '';
    const match = p.toString().match(/\$?\s*([0-9,.]+)/);
    return match ? `$${match[1]}` : p;
}

function loadCart(){
    const raw = localStorage.getItem('cart_items');
    return raw ? JSON.parse(raw) : [];
}

function saveCart(items){
    localStorage.setItem('cart_items', JSON.stringify(items));
}

function renderCart(){
    const contents = document.getElementById('cart-contents');
    const summary = document.getElementById('cart-summary');
    const totalEl = document.getElementById('cart-total');
    const items = loadCart();
    const cartCount = items.reduce((s,i)=>s + (i.qty||0), 0);
    document.getElementById('cart-count').textContent = cartCount;

    if(items.length === 0){
        contents.innerHTML = '<p>Your cart is empty.</p>';
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    contents.innerHTML = '';
    let total = 0;
    items.forEach((it, idx)=>{
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.style.border = '1px solid #eee';
        el.style.padding = '12px';
        el.style.marginBottom = '10px';
        el.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center;">
                <img src="${it.image || 'images/home.png'}" style="width:84px; height:84px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <h3 style="margin:0">${it.name}</h3>
                    <div style="color:#666;">Size: ${it.size}</div>
                    <div style="margin-top:6px;">Price: ${formatPrice(it.price)} x ${it.qty}</div>
                </div>
                <div>
                    <button data-idx="${idx}" class="remove-item" style="background:#a72e1b; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">Remove</button>
                </div>
            </div>
        `;
        contents.appendChild(el);
        // try to parse price number
        const num = parseFloat((it.price||'').replace(/[^0-9.]/g,'')) || 0;
        total += num * (it.qty||1);
    });
    totalEl.textContent = `Total: $${total.toFixed(2)}`;

    document.querySelectorAll('.remove-item').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = Number(btn.dataset.idx);
            const items = loadCart();
            items.splice(idx,1);
            saveCart(items);
            renderCart();
        });
    });
}

function computeTotal(){
    const items = loadCart();
    return items.reduce((sum, it) => {
        const num = parseFloat((it.price||'').replace(/[^0-9.]/g,'')) || 0;
        return sum + num * (it.qty||1);
    }, 0);
}

function showCheckoutModal(total, qrOverride){
    if(document.getElementById('checkout-modal')) return;
    const qrText = `Total: $${total.toFixed(2)}`;
    // default generated QR (Google Charts). You can override by passing a URL
    // as the second parameter, or by setting `window.CHECKOUT_QR_URL`.
    const defaultQr = `https://chart.googleapis.com/chart?chs=280x280&cht=qr&chl=${encodeURIComponent(qrText)}`;
    const qrSrc =  'images/image.png';
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.className = 'checkout-dialog';
    modal.innerHTML = `
        <div class="checkout-overlay"></div>
        <div class="checkout-box">
            <button class="checkout-close" aria-label="Close">&times;</button>
            <div class="checkout-content">
                <img class="checkout-qr" src="${qrSrc}" alt="QR code">
                <div class="checkout-amount">${qrText}</div>
                <div class="checkout-actions">
                    <button id="checkout-cancel" class="btn-cancel">Cancel</button>
                    <button id="checkout-done" class="btn-done">Done</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const removeModal = ()=>{ const m = document.getElementById('checkout-modal'); if(m) m.remove(); };

    modal.querySelector('.checkout-overlay').addEventListener('click', removeModal);
    modal.querySelector('.checkout-close').addEventListener('click', removeModal);
    modal.querySelector('#checkout-cancel').addEventListener('click', removeModal);
    modal.querySelector('#checkout-done').addEventListener('click', ()=>{
        // clear cart
        saveCart([]);
        removeModal();
        renderCart();
        // update header count if present
        const headerCount = document.getElementById('cart-count');
        if(headerCount) headerCount.textContent = 0;
    });
}

window.addEventListener('DOMContentLoaded', ()=>{
    renderCart();
});

// wire checkout button
const checkoutBtn = document.getElementById('checkout-btn');
if(checkoutBtn){
    checkoutBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        const total = computeTotal();
        if(total <= 0) return;
        showCheckoutModal(total);
    });
}

// Expose small API for index page to update cart count
window.__cartApi = {
    add(item){
        const items = loadCart();
        // try to merge same product+size
        const existing = items.find(i=> i.name === item.name && i.size === item.size);
        if(existing){ existing.qty = (existing.qty||0) + (item.qty||1); }
        else items.push(item);
        saveCart(items);
    }
};
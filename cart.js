document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function formatPrice(p){
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
    
    const displayCount = document.getElementById('cart-count');
    if(displayCount) displayCount.textContent = cartCount;

    if(items.length === 0){
        contents.innerHTML = '<p>Your cart is empty.</p>';
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    contents.innerHTML = '';
    let total = 0;
    
    items.forEach((it, idx)=>{
        // Use your clean parsed discount base price explicitly
        const baselinePrice = parseFloat(it.baseLargePrice) || parseFloat((it.price||'').replace(/[^0-9.]/g,'')) || 0;
        
        let finalPriceForSize = baselinePrice; // Base price is Large
        
        if (it.size && it.size.toLowerCase() === 'medium') {
            finalPriceForSize = baselinePrice * 0.80; // 20% discount
        } else if (it.size && it.size.toLowerCase() === 'small') {
            finalPriceForSize = (baselinePrice * 0.80) * 0.90; // 10% discount off medium
        }

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
                    <div style="color:#666;">Size: ${it.size || 'Standard'}</div>
                    <div style="margin-top:6px;">Price: $${finalPriceForSize.toFixed(2)} x ${it.qty}</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button data-idx="${idx}" class="edit-item" style="background:#e67e22; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Edit</button>
                    <button data-idx="${idx}" class="remove-item" style="background:#a72e1b; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">Remove</button>
                </div>
            </div>
        `;
        contents.appendChild(el);
        
        total += finalPriceForSize * (it.qty||1);
    });
    
    totalEl.textContent = `Total: $${total.toFixed(2)}`;

    // Set up Remove Item Listeners
    document.querySelectorAll('.remove-item').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = Number(btn.dataset.idx);
            const items = loadCart();
            items.splice(idx,1);
            saveCart(items);
            renderCart();
        });
    });

    // Set up Edit Item Listeners
    document.querySelectorAll('.edit-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            const items = loadCart();
            const itemToEdit = items[idx];

            localStorage.setItem('editing_cart_index', idx);

            const originalBasePrice = parseFloat(itemToEdit.baseLargePrice) || parseFloat((itemToEdit.price||'').replace(/[^0-9.]/g, '')) || 0;

            const modalPayload = {
                name: itemToEdit.name,
                price: `$${originalBasePrice.toFixed(2)}`,
                largePrice: originalBasePrice,     // FIXED: Added here to align with main.js openProductModal expectations
                baseLargePrice: originalBasePrice, // Fallback safety parameter
                image: itemToEdit.image,
                description: `Adjust your options for ${itemToEdit.name}.`
            };

            localStorage.setItem('trigger_edit_modal', JSON.stringify(modalPayload));
            window.location.href = 'index.html';
        });
    });
}

function computeTotal(){
    const items = loadCart();
    return items.reduce((sum, it) => {
        const baselinePrice = parseFloat(it.baseLargePrice) || parseFloat((it.price||'').replace(/[^0-9.]/g,'')) || 0;
        
        let finalPriceForSize = baselinePrice;
        if (it.size && it.size.toLowerCase() === 'medium') {
            finalPriceForSize = baselinePrice * 0.80;
        } else if (it.size && it.size.toLowerCase() === 'small') {
            finalPriceForSize = (baselinePrice * 0.80) * 0.90;
        }
        
        return sum + (finalPriceForSize * (it.qty||1));
    }, 0);
}

function showCheckoutModal(total, qrOverride){
    if(document.getElementById('checkout-modal')) return;
    const qrText = `Total: $${total.toFixed(2)}`;
    const qrSrc = 'images/image.png';
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
    
    modal.querySelector('#checkout-done').addEventListener('click', () => {
        const currentCart = loadCart();

        if (!currentCart || currentCart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        fetch('http://127.0.0.1:8000/API_folder/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart_items: currentCart
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Server error status: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            alert("Success! " + (data.message || "Order processed successfully!") + "\nOrder ID: " + (data.order_id || "Received")); 
            saveCart([]);
            removeModal();
            renderCart();
            
            const headerCount = document.getElementById('cart-count');
            if(headerCount) headerCount.textContent = 0;
        })
        .catch(err => {
            console.error("API Connection Error:", err);
            alert("Connection Failed! Make sure Docker is running inside restaurant_backend.");
        });
    });
}

const checkoutBtn = document.getElementById('checkout-btn');
if(checkoutBtn){
    checkoutBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        const total = computeTotal();
        if(total <= 0) return;
        showCheckoutModal(total);
    });
}

window.__cartApi = {
    add(item){
        const items = loadCart();
        const existing = items.find(i=> i.name === item.name && i.size === item.size);
        if(existing){ existing.qty = (existing.qty||0) + (item.qty||1); }
        else items.push(item);
        saveCart(items);
    }
};
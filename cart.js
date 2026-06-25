document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    initCartAuthModal();
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

    if(!contents) return;

    if(items.length === 0){
        contents.innerHTML = '<p>Your cart is empty.</p>';
        if(summary) summary.style.display = 'none';
        return;
    }

    if(summary) summary.style.display = 'block';
    contents.innerHTML = '';
    let total = 0;
    
    items.forEach((it, idx)=>{
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
    
    if(totalEl) totalEl.textContent = `Total: $${total.toFixed(2)}`;

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
                largePrice: originalBasePrice,
                baseLargePrice: originalBasePrice,
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

function showCheckoutModal(total){
    if(document.getElementById('checkout-modal')) return;
    const qrText = `Total: $${total.toFixed(2)}`;
    const qrSrc = 'images/image.png';
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.className = 'checkout-dialog';
    modal.innerHTML = `
        <div class="checkout-overlay" style="position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000;"></div>
        <div class="checkout-box" style="position: fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:30px; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:2001; text-align:center; width:300px;">
            <button class="checkout-close" aria-label="Close" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:22px; font-weight:bold; cursor:pointer;">&times;</button>
            <div class="checkout-content">
                <img class="checkout-qr" src="${qrSrc}" alt="QR code" style="width:200px; height:200px; margin-bottom:15px;">
                <div class="checkout-amount" style="font-size:18px; font-weight:bold; color:#333; margin-bottom:20px;">${qrText}</div>
                <div class="checkout-actions" style="display:flex; gap:10px; justify-content:center;">
                    <button id="checkout-cancel" class="btn-cancel" style="padding:10px 20px; border:1px solid #ccc; background:#fff; border-radius:5px; cursor:pointer;">Cancel</button>
                    <button id="checkout-done" class="btn-done" style="padding:10px 20px; border:none; background:#ff4757; color:white; font-weight:bold; border-radius:5px; cursor:pointer;">Done</button>
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
        
        // CHECK IF LOGGED IN COHESIVELY WITH SESSIONSTORAGE KEY
        const activePhone = sessionStorage.getItem('userPhone');
        const activeUser = sessionStorage.getItem('userUsername');
        
        if (!activePhone || !activeUser) {
            alert("⚠️ Authentication Required! Please enter your phone number, name, and password using the profile icon at the top of the page before completing your order.");
            removeModal();
            return;
        }

        const currentCart = loadCart();
        if (!currentCart || currentCart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        // Send cart data alongside database values matching phone primary constraint layout
        fetch('https://burgeraub.xyz/API_folder/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: activeUser,
                phone_number: activePhone,
                cart_items: JSON.stringify(currentCart),
                total_amount: total
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Server error status: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            if(data.status === "success") {
                alert("Success! " + (data.message || "Order processed successfully!") + "\nOrder ID: " + (data.order_id || "Received")); 
                saveCart([]);
                removeModal();
                renderCart();
                
                const headerCount = document.getElementById('cart-count');
                if(headerCount) headerCount.textContent = 0;
            } else {
                alert("Order Failed: " + data.message);
            }
        })
        .catch(err => {
            console.error("API Connection Error:", err);
            alert("Connection Failed! Make sure your backend API folder server container is active.");
        });
    });
}

// Controls checking/registering phone authentication states seamlessly
function initCartAuthModal() {
    const profileIcon = document.getElementById('profile-icon');
    const authModal = document.getElementById('authModal');
    const closeAuth = document.getElementById('closeAuth');
    const authForm = document.getElementById('authForm');

    if (profileIcon) {
        profileIcon.addEventListener('click', (e) => {
            e.preventDefault();
            if (authModal) authModal.style.display = 'flex';
        });
    }

    if (closeAuth) {
        closeAuth.addEventListener('click', () => {
            if (authModal) authModal.style.display = 'none';
        });
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.style.display = 'none';
            }
        });
    }

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

            // Phone number length constraint check
            if (phoneVal.length < 8) {
                if (phoneError) phoneError.style.display = 'block';
                isValid = false;
            } else {
                if (phoneError) phoneError.style.display = 'none';
            }

            // Username validation constraint check
            if (userVal.length < 4) {
                if (userError) userError.style.display = 'block';
                isValid = false;
            } else {
                if (userError) userError.style.display = 'none';
            }

            // Password validation constraint check
            if (passVal.length < 6) {
                if (passError) passError.style.display = 'block';
                isValid = false;
            } else {
                if (passError) passError.style.display = 'none';
            }

            if (isValid) {
                // Fetch request to backend handling combined Login/Register functionality
                fetch('https://burgeraub.xyz/API_folder/auth.php', {
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
                        alert(data.message); // Will say "Login Successful" or "Registration Successful"
                        
                        // Save identity info securely to storage state matching the order script tracking
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
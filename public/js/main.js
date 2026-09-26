// ==================== GIỎ HÀNG ====================

// Cập nhật số lượng hiển thị trên icon giỏ hàng
function updateCartCount() {
    fetch('/cart/count')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            var cartCountElement = document.getElementById('cart-count');
            if (cartCountElement) {
                cartCountElement.innerText = data.count || 0;
            }
        })
        .catch(function(error) {
            console.log('Lỗi khi cập nhật số lượng giỏ hàng:', error);
        });
}

// Thêm sản phẩm vào giỏ hàng
function addToCart(productId, quantity) {
    quantity = quantity || 1;
    
    fetch('/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            productId: productId, 
            quantity: quantity 
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            updateCartCount();
            showNotification('success', 'Đã thêm sản phẩm vào giỏ hàng thành công!');
        } else {
            showNotification('error', data.message || 'Lỗi khi thêm sản phẩm vào giỏ hàng');
        }
    })
    .catch(function(error) {
        console.log('Lỗi:', error);
        showNotification('error', 'Đã xảy ra lỗi, vui lòng thử lại sau');
    });
}

// Xóa sản phẩm khỏi giỏ hàng
function removeFromCart(productId) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        fetch('/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId: productId })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            window.location.reload();
        })
        .catch(function(error) {
            console.log('Lỗi:', error);
            showNotification('error', 'Xóa sản phẩm thất bại, vui lòng thử lại');
        });
    }
}

// Cập nhật số lượng sản phẩm trong giỏ hàng
function updateCartQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    fetch('/cart/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            productId: productId, 
            quantity: newQuantity 
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        window.location.reload();
    })
    .catch(function(error) {
        console.log('Lỗi:', error);
        showNotification('error', 'Cập nhật số lượng thất bại, vui lòng thử lại');
    });
}

// ==================== THÔNG BÁO ====================

function showNotification(type, message) {
    // Xóa notification cũ nếu có
    var oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle') + '"></i> ' + message;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; background: ' + (type === 'success' ? '#27ae60' : '#e74c3c') + '; color: white; border-radius: 10px; z-index: 9999; animation: slideIn 0.3s ease; box-shadow: 0 5px 20px rgba(0,0,0,0.2);';
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ==================== BỘ LỌC SẢN PHẨM ====================

function applyFilters() {
    var filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.submit();
    }
}

function clearFilters() {
    window.location.href = '/products';
}

function applySorting() {
    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        var sortValue = sortSelect.value;
        var currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('sort', sortValue);
        window.location.href = currentUrl.toString();
    }
}

// ==================== SỐ LƯỢNG SẢN PHẨM ====================

function decreaseQuantity() {
    var quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        var currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    }
}

function increaseQuantity() {
    var quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        var currentValue = parseInt(quantityInput.value);
        var maxValue = parseInt(quantityInput.getAttribute('max')) || 999;
        if (currentValue < maxValue) {
            quantityInput.value = currentValue + 1;
        }
    }
}

function addToCartWithQuantity(productId) {
    var quantityInput = document.getElementById('quantity');
    var quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    addToCart(productId, quantity);
}

// ==================== TAB (CHI TIẾT SẢN PHẨM) ====================

function openTab(event, tabId) {
    var tabContents = document.getElementsByClassName('tab-content');
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    var tabButtons = document.getElementsByClassName('tab-button');
    for (var i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ==================== HỦY ĐƠN HÀNG ====================

function cancelOrder(orderId) {
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.')) {
        fetch('/orders/' + orderId + '/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                showNotification('success', 'Đã hủy đơn hàng thành công');
                setTimeout(function() {
                    window.location.reload();
                }, 1000);
            } else {
                showNotification('error', data.message || 'Hủy đơn hàng thất bại');
            }
        })
        .catch(function(error) {
            console.log('Lỗi:', error);
            showNotification('error', 'Hủy đơn hàng thất bại, vui lòng thử lại sau');
        });
    }
}

// ==================== VALIDATION FORM ====================

function validateRegisterForm() {
    var fullName = document.getElementById('fullName');
    var email = document.getElementById('email');
    var phone = document.getElementById('phone');
    var password = document.getElementById('password');
    var confirmPassword = document.getElementById('confirmPassword');
    
    if (fullName && fullName.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập họ và tên');
        return false;
    }
    
    if (email && email.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập email');
        return false;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.value)) {
        showNotification('error', 'Email không hợp lệ');
        return false;
    }
    
    if (phone && phone.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập số điện thoại');
        return false;
    }
    
    var phoneRegex = /^[0-9]{10,11}$/;
    if (phone && !phoneRegex.test(phone.value)) {
        showNotification('error', 'Số điện thoại không hợp lệ (10-11 số)');
        return false;
    }
    
    if (password && password.value.length < 6) {
        showNotification('error', 'Mật khẩu phải có ít nhất 6 ký tự');
        return false;
    }
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
        showNotification('error', 'Mật khẩu xác nhận không khớp');
        return false;
    }
    
    return true;
}

function validateChangePasswordForm() {
    var currentPassword = document.getElementById('currentPassword');
    var newPassword = document.getElementById('newPassword');
    var confirmPassword = document.getElementById('confirmPassword');
    
    if (currentPassword && currentPassword.value === '') {
        showNotification('error', 'Vui lòng nhập mật khẩu hiện tại');
        return false;
    }
    
    if (newPassword && newPassword.value.length < 6) {
        showNotification('error', 'Mật khẩu mới phải có ít nhất 6 ký tự');
        return false;
    }
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
        showNotification('error', 'Mật khẩu xác nhận không khớp');
        return false;
    }
    
    return true;
}

function validateCheckoutForm() {
    var fullName = document.querySelector('input[name="fullName"]');
    var email = document.querySelector('input[name="email"]');
    var phone = document.querySelector('input[name="phone"]');
    var address = document.querySelector('input[name="address"]');
    
    if (fullName && fullName.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập họ và tên');
        fullName.focus();
        return false;
    }
    
    if (email && email.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập email');
        email.focus();
        return false;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.value)) {
        showNotification('error', 'Email không hợp lệ');
        email.focus();
        return false;
    }
    
    if (phone && phone.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập số điện thoại');
        phone.focus();
        return false;
    }
    
    var phoneRegex = /^[0-9]{10,11}$/;
    if (phone && !phoneRegex.test(phone.value)) {
        showNotification('error', 'Số điện thoại không hợp lệ (10-11 số)');
        phone.focus();
        return false;
    }
    
    if (address && address.value.trim() === '') {
        showNotification('error', 'Vui lòng nhập địa chỉ giao hàng');
        address.focus();
        return false;
    }
    
    return true;
}

// ==================== TÌM KIẾM ====================

function searchProducts() {
    var searchInput = document.querySelector('input[name="q"]');
    if (searchInput && searchInput.value.trim() !== '') {
        window.location.href = '/search?q=' + encodeURIComponent(searchInput.value);
    }
    return false;
}

// ==================== SCROLL TO TOP ====================

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Thêm nút scroll to top khi cuộn trang
window.addEventListener('scroll', function() {
    var scrollBtn = document.getElementById('scrollToTop');
    if (!scrollBtn) {
        scrollBtn = document.createElement('button');
        scrollBtn.id = 'scrollToTop';
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.style.cssText = 'position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: #e74c3c; color: white; border: none; border-radius: 50%; cursor: pointer; display: none; z-index: 999; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: all 0.3s;';
        scrollBtn.onclick = scrollToTop;
        document.body.appendChild(scrollBtn);
    }
    
    if (window.scrollY > 300) {
        scrollBtn.style.display = 'block';
    } else {
        scrollBtn.style.display = 'none';
    }
});

// ==================== KHỞI TẠO KHI TRANG LOAD ====================

document.addEventListener('DOMContentLoaded', function() {
    // Cập nhật số lượng giỏ hàng
    updateCartCount();
    
    // Gắn sự kiện cho form đăng ký
    var registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            if (!validateRegisterForm()) {
                event.preventDefault();
            }
        });
    }
    
    // Gắn sự kiện cho form đổi mật khẩu
    var changePasswordForm = document.querySelector('form[action="/account/change-password"]');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(event) {
            if (!validateChangePasswordForm()) {
                event.preventDefault();
            }
        });
    }
    
    // Gắn sự kiện cho form thanh toán
    var checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(event) {
            if (!validateCheckoutForm()) {
                event.preventDefault();
            }
        });
    }
    
    // Gắn sự kiện cho form tìm kiếm
    var searchForm = document.querySelector('.search-bar form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            searchProducts();
        });
    }
    
    // Tự động đóng thông báo alert sau 5 giây
    var alertMessages = document.querySelectorAll('.alert');
    if (alertMessages.length > 0) {
        setTimeout(function() {
            alertMessages.forEach(function(alert) {
                alert.style.transition = 'opacity 0.5s';
                alert.style.opacity = '0';
                setTimeout(function() {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            });
        }, 5000);
    }
    
    // Hiệu ứng hover cho product card
    var productCards = document.querySelectorAll('.product-card');
    productCards.forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Thêm CSS animation cho notification và các hiệu ứng
var style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .product-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .btn, .add-to-cart-btn, .add-to-cart-detail {
        transition: all 0.3s ease;
    }
    
    .add-to-cart-btn:hover, .add-to-cart-detail:hover {
        transform: translateY(-2px);
    }
    
    .qty-btn {
        transition: all 0.2s ease;
    }
    
    .qty-btn:hover {
        background: #e74c3c;
        color: white;
    }
    
    /* Loading spinner */
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #e74c3c;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
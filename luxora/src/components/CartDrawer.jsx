import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/products';
import './CartDrawer.css';

export default function CartDrawer() {
  const { cartItems, removeFromCart, updateQuantity, subtotal, cartCount, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  function handleCheckout() {
    setIsCartOpen(false);
    navigate('/checkout');
  }

  function handleViewCart() {
    setIsCartOpen(false);
    navigate('/cart');
  }

  const freeShippingThreshold = 2999;
  const shipping = subtotal >= freeShippingThreshold ? 0 : 99;
  const total = subtotal + shipping;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cart-backdrop ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <aside className={`cart-drawer ${isCartOpen ? 'open' : ''}`} aria-label="Shopping Bag">
        {/* Header */}
        <div className="cart-drawer-header">
          <div>
            <h2 className="cart-drawer-title">Shopping Bag</h2>
            {cartCount > 0 && (
              <p className="cart-drawer-count">{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
            )}
          </div>
          <button
            className="cart-drawer-close"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>Your bag is empty</p>
              <Link to="/shop" className="btn btn-dark" onClick={() => setIsCartOpen(false)}>
                Explore Collection
              </Link>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.cartItemId} className="cart-drawer-item">
                <img src={item.image} alt={item.name} className="cart-drawer-item-img" />
                <div className="cart-drawer-item-info">
                  <div className="cart-drawer-item-top">
                    <div>
                      <h4 className="cart-drawer-item-name">{item.name}</h4>
                      <p className="cart-drawer-item-variant">
                        {item.size !== 'One Size' ? `Size: ${item.size}` : 'One Size'} · {item.color}
                      </p>
                    </div>
                    <button
                      className="cart-drawer-remove"
                      onClick={() => removeFromCart(item.cartItemId)}
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="cart-drawer-item-bottom">
                    <div className="cart-drawer-qty">
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>+</button>
                    </div>
                    <span className="cart-drawer-item-price">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-shipping-note">
              {subtotal >= freeShippingThreshold
                ? '✓ Complimentary shipping on this order'
                : `Add ${formatPrice(freeShippingThreshold - subtotal)} more for free shipping`
              }
            </div>
            <div className="cart-drawer-totals">
              <div className="cart-drawer-total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-drawer-total-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="cart-drawer-total-row cart-drawer-grand-total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <button className="btn btn-dark cart-drawer-checkout-btn" onClick={handleCheckout}>
              Proceed to Checkout
            </button>
            <button className="cart-drawer-view-btn" onClick={handleViewCart}>
              View Cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

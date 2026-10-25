import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/products';
import Footer from '../components/Footer';
import './Cart.css';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const shipping = subtotal >= 2999 ? 0 : 99;
  const discount = promoApplied ? Math.round(subtotal * 0.35) : 0;
  const total = subtotal - discount + shipping;

  function handleApplyPromo() {
    if (promoCode.toUpperCase() === 'LUXORA35') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid promo code');
      setPromoApplied(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <h2>Your bag is empty</h2>
          <p>Discover our collection and find your perfect pieces.</p>
          <Link to="/shop" className="btn btn-dark">Explore Collection</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-page-inner">
        <h1 className="cart-page-title serif">Your Cart</h1>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items-col">
            {cartItems.map(item => (
              <div key={item.cartItemId} className="cart-item-row">
                <Link to={`/product/${item.id}`} className="cart-item-img-wrap">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                </Link>
                <div className="cart-item-details">
                  <div className="cart-item-details-top">
                    <div>
                      <Link to={`/product/${item.id}`} className="cart-item-name">{item.name}</Link>
                      <p className="cart-item-meta">Variant: {item.category}</p>
                      <p className="cart-item-meta">Size: {item.size}</p>
                      <p className="cart-item-meta">Color: {item.color}</p>
                      <p className="cart-item-price">{formatPrice(item.price)}</p>
                    </div>
                    <button
                      className="cart-item-delete"
                      onClick={() => removeFromCart(item.cartItemId)}
                      aria-label="Remove item"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                  <div className="cart-item-qty-row">
                    <div className="cart-qty-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >−</button>
                      <span className="cart-qty-value">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      >+</button>
                    </div>
                    <span className="cart-item-subtotal">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Continue Shopping */}
            <div className="cart-continue">
              <Link to="/shop" className="cart-continue-link">
                ← Continue Shopping
              </Link>
              <button className="cart-clear-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </div>
          </div>

          {/* Summary */}
          <aside className="cart-summary-col">
            <div className="cart-summary-card">
              <h2 className="cart-summary-title">Order Summary</h2>

              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {promoApplied && (
                  <div className="cart-summary-row cart-summary-discount">
                    <span>Discount (-35%)</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="cart-summary-row">
                  <span>Delivery Fee</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="cart-summary-row cart-summary-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="cart-promo">
                <div className="cart-promo-input-row">
                  <input
                    type="text"
                    placeholder="Add promo code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    className="cart-promo-input form-input"
                  />
                  <button className="cart-promo-btn" onClick={handleApplyPromo}>
                    Apply
                  </button>
                </div>
                {promoApplied && <p className="promo-success">✓ LUXORA35 applied — 35% off!</p>}
                {promoError && <p className="promo-error">{promoError}</p>}
                <p className="promo-hint">Try: LUXORA35</p>
              </div>

              <button
                className="cart-checkout-btn btn btn-dark"
                onClick={() => navigate('/checkout')}
                id="go-to-checkout-btn"
              >
                Go to Checkout
              </button>

              <div className="cart-summary-trust">
                <p>🔒 Secure checkout</p>
                <p>Free returns within 14 days</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

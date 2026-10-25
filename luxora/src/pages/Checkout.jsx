import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/products';
import './Checkout.css';

const STEPS = ['Shipping', 'Payment', 'Review', 'Confirmation'];

const SHIPPING_METHODS = [
  { id: 'standard', label: 'Standard Delivery', sublabel: '3–5 business days', price: 0, priceLabel: 'FREE' },
  { id: 'express', label: 'Express Delivery', sublabel: '1–2 business days', price: 99, priceLabel: '₹99' },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', sublabel: 'Visa, Mastercard, etc.', icon: '💳' },
  { id: 'paypal', label: 'PayPal', sublabel: 'Pay with PayPal', icon: '🔵' },
  { id: 'cod', label: 'Cash on Delivery', sublabel: 'Pay when you receive', icon: '💵' },
];

export default function Checkout() {
  const { cartItems, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [form, setForm] = useState({
    email: '', sendUpdates: true,
    firstName: '', lastName: '', mobile: '', street: '', city: '', state: '', pin: '',
    saveAddress: false,
  });
  const [confirmed, setConfirmed] = useState(false);

  const shipping = shippingMethod === 'express' ? 99 : (subtotal >= 2999 ? 0 : 0);
  const total = subtotal + shipping;

  function handleInput(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handlePlaceOrder() {
    setConfirmed(true);
    clearCart();
  }

  if (confirmed) {
    return (
      <div className="checkout-confirmed">
        <div className="checkout-confirmed-inner">
          <div className="checkout-confirmed-icon">✓</div>
          <h1 className="checkout-confirmed-title serif">Order Confirmed!</h1>
          <p className="checkout-confirmed-sub">
            Thank you for your purchase. We'll send a confirmation to <strong>{form.email || 'your email'}</strong>.
          </p>
          <p className="checkout-confirmed-order">Order #LXR-{Math.floor(Math.random() * 90000) + 10000}</p>
          <Link to="/" className="btn btn-dark">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Step Indicator */}
      <div className="checkout-steps-bar">
        <div className="checkout-steps-inner">
          {STEPS.map((step, i) => (
            <div key={step} className={`checkout-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}>
              <div className="checkout-step-num">{i < currentStep ? '✓' : i + 1}</div>
              <span className="checkout-step-label">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="checkout-hero">
        <div className="checkout-hero-content">
          <h1 className="checkout-hero-title serif">Checkout</h1>
          <p className="checkout-hero-sub">A few details, and your next favourite piece is on its way.</p>
        </div>
      </div>

      {/* Main */}
      <div className="checkout-main">
        <div className="checkout-layout">
          {/* Left: Form */}
          <div className="checkout-form-col">
            {/* 1. Contact */}
            <section className="checkout-section">
              <div className="checkout-section-header">
                <h2 className="checkout-section-title">1. Contact Information</h2>
                <span className="checkout-login-hint">
                  Already have an account? <Link to="/" className="checkout-login-link">Log in</Link>
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Email address *</label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon">✉</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleInput}
                    className="form-input form-input-icon-pad"
                  />
                </div>
              </div>
              <label className="checkout-checkbox-label">
                <input
                  type="checkbox"
                  name="sendUpdates"
                  checked={form.sendUpdates}
                  onChange={handleInput}
                />
                <span>Send me updates about my order and exclusive offers</span>
              </label>
              <p className="form-hint">We'll send your order confirmation here.</p>
            </section>

            {/* 2. Delivery Address */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">2. Delivery Address</h2>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">First name *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">👤</span>
                    <input type="text" name="firstName" placeholder="John" value={form.firstName} onChange={handleInput} className="form-input form-input-icon-pad" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Last name *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">👤</span>
                    <input type="text" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleInput} className="form-input form-input-icon-pad" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile number *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">📱</span>
                    <input type="tel" name="mobile" placeholder="+91 98765 43210" value={form.mobile} onChange={handleInput} className="form-input form-input-icon-pad" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Street address *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">📍</span>
                    <input type="text" name="street" placeholder="123 Main Street" value={form.street} onChange={handleInput} className="form-input form-input-icon-pad" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">🏙</span>
                    <input type="text" name="city" placeholder="New York" value={form.city} onChange={handleInput} className="form-input form-input-icon-pad" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <div className="form-input-icon-wrap">
                    <span className="form-input-icon">🗺</span>
                    <select name="state" value={form.state} onChange={handleInput} className="form-input form-input-icon-pad">
                      <option value="">Select State</option>
                      {['Gujarat', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'West Bengal'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <label className="checkout-checkbox-label">
                <input type="checkbox" name="saveAddress" checked={form.saveAddress} onChange={handleInput} />
                <span>Save this address for future orders.</span>
              </label>
            </section>

            {/* 3. Shipping Method */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">3. Shipping Method</h2>
              <div className="checkout-shipping-methods">
                {SHIPPING_METHODS.map(method => (
                  <label
                    key={method.id}
                    className={`checkout-method-option ${shippingMethod === method.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={method.id}
                      checked={shippingMethod === method.id}
                      onChange={() => setShippingMethod(method.id)}
                    />
                    <span className="checkout-method-icon">🚚</span>
                    <div className="checkout-method-info">
                      <span className="checkout-method-name">{method.label}</span>
                      <span className="checkout-method-sub">{method.sublabel}</span>
                    </div>
                    <span className="checkout-method-price">{method.priceLabel}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* 4. Payment Method */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">4. Payment Method</h2>
              <div className="checkout-payment-methods">
                {PAYMENT_METHODS.map(method => (
                  <label
                    key={method.id}
                    className={`checkout-method-option ${paymentMethod === method.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                    />
                    <span className="checkout-method-icon">{method.icon}</span>
                    <div className="checkout-method-info">
                      <span className="checkout-method-name">{method.label}</span>
                      <span className="checkout-method-sub">{method.sublabel}</span>
                    </div>
                  </label>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="checkout-card-form">
                  <div className="form-group">
                    <label className="form-label">Card number</label>
                    <input type="text" placeholder="•••• •••• •••• ••••" className="form-input" maxLength={19} />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Expiry</label>
                      <input type="text" placeholder="MM / YY" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input type="text" placeholder="•••" className="form-input" maxLength={3} />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right: Order Summary */}
          <aside className="checkout-summary-col">
            <div className="checkout-summary-card">
              <h2 className="checkout-summary-title">Order Summary</h2>
              <span className="checkout-summary-count">{cartItems.length} items</span>

              <div className="checkout-summary-items">
                {cartItems.map(item => (
                  <div key={item.cartItemId} className="checkout-summary-item">
                    <div className="checkout-summary-item-img-wrap">
                      <img src={item.image} alt={item.name} className="checkout-summary-item-img" />
                      <span className="checkout-summary-item-qty">{item.quantity}</span>
                    </div>
                    <div className="checkout-summary-item-info">
                      <p className="checkout-summary-item-name">{item.name}</p>
                      <p className="checkout-summary-item-meta">{item.color} | {item.size}</p>
                      <div className="checkout-summary-item-qty-row">
                        <span>×{item.quantity}</span>
                      </div>
                    </div>
                    <span className="checkout-summary-item-price">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Discount Code */}
              <div className="checkout-discount-wrap">
                <p className="checkout-discount-label">Discount Code</p>
                <div className="checkout-discount-input-row">
                  <input type="text" placeholder="Enter code" className="form-input" />
                  <button className="btn btn-dark checkout-discount-btn">Apply</button>
                </div>
              </div>

              {/* Totals */}
              <div className="checkout-totals">
                <div className="checkout-total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="checkout-total-row">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
                <div className="checkout-total-row checkout-grand-total">
                  <span>Total (INR)</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                className="btn btn-dark checkout-place-order-btn"
                onClick={handlePlaceOrder}
                id="place-order-btn"
              >
                Place Your Order →
              </button>

              <div className="checkout-secure-badges">
                <p>🔒 Secure Checkout | 256-bit SSL Encryption</p>
                <div className="checkout-payment-logos">
                  <span className="pay-logo">VISA</span>
                  <span className="pay-logo">MC</span>
                  <span className="pay-logo">PayPal</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

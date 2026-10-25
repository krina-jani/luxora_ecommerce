import { Link } from 'react-router-dom';
import './Footer.css';

const footerLinks = {
  'Company': ['About Us', 'Journal', 'Careers', 'Press'],
  'Customer Care': ['Contact Us', 'Shipping & Returns', 'Size Guide', 'Care Instructions'],
  'Legal': ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

export default function Footer() {
  return (
    <footer className="footer">
      {/* Trust Bar */}
      <div className="trust-bar">
        <div className="trust-bar-inner">
          <div className="trust-item">
            <span className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 5v2h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </span>
            <div className="trust-text">
              <h4>Complimentary Shipping</h4>
              <p>On all orders over ₹2,999</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.69"/>
              </svg>
            </span>
            <div className="trust-text">
              <h4>Easy Returns</h4>
              <p>14-day return policy</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <div className="trust-text">
              <h4>Secure Payments</h4>
              <p>Encrypted and protected</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.27a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17"/>
              </svg>
            </span>
            <div className="trust-text">
              <h4>Personal Shopping</h4>
              <p>Style advice, just for you</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">
        <div className="footer-inner">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <Link to="/" className="footer-logo">LUXORA</Link>
              <p className="footer-tagline">
                Timeless design for a<br />life well-lived.
              </p>
              <div className="footer-socials">
                {['Instagram', 'Facebook', 'Pinterest'].map(s => (
                  <a key={s} href="#" className="footer-social-link" aria-label={s}>
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title} className="footer-col">
                <h4 className="footer-col-title">{title}</h4>
                <ul className="footer-link-list">
                  {links.map(link => (
                    <li key={link}>
                      <a href="#" className="footer-link">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter */}
            <div className="footer-col">
              <h4 className="footer-col-title">Newsletter</h4>
              <p className="footer-newsletter-text">
                New arrivals, exclusive access & curated edits.
              </p>
              <div className="footer-newsletter-form">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="footer-newsletter-input"
                />
                <button className="footer-newsletter-btn">→</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2025 LUXORA. All rights reserved.</p>
            <p>Made with care for a life well-lived.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

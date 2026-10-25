import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import './Navbar.css';

const navLinks = [
  { label: 'New In', href: '/shop?filter=new' },
  { label: 'Women', href: '/shop?gender=women' },
  { label: 'Men', href: '/shop?gender=men' },
  { label: 'Accessories', href: '/shop?category=Accessories' },
  { label: 'Collections', href: '/shop' },
  { label: 'Journal', href: '/shop' },
];

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistItems } = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* Announcement Bar */}
      <div className="announcement-bar">
        <span>Complimentary shipping on all orders over ₹2,999</span>
        <span className="announcement-right">Ship to: India ↓</span>
      </div>

      {/* Main Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo">LUXORA</Link>

          {/* Center Nav Links */}
          <ul className="nav-links">
            {navLinks.map(link => (
              <li key={link.label}>
                <Link
                  to={link.href}
                  className={`nav-link ${location.pathname === link.href ? 'nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Icons */}
          <div className="navbar-icons">
            <button className="icon-btn" id="search-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <Link to="/wishlist" className="icon-btn" id="wishlist-btn" aria-label="Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlistItems.length > 0 && <span className="badge">{wishlistItems.length}</span>}
            </Link>
            <button className="icon-btn" id="account-btn" aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <button
              className="icon-btn"
              id="cart-btn"
              aria-label="Shopping bag"
              onClick={() => setIsCartOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>

            {/* Mobile toggle */}
            <button
              className="icon-btn nav-mobile-toggle"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          {navLinks.map(link => (
            <Link key={link.label} to={link.href} className="mobile-menu-link">
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

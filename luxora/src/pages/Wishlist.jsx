import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import './Wishlist.css';

export default function Wishlist() {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlistItems.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h2>Your Wishlist is Empty</h2>
          <p>Save the pieces you love and come back to them anytime.</p>
          <Link to="/shop" className="btn btn-dark">Explore Collection</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-inner">
        <div className="wishlist-header">
          <h1 className="wishlist-title serif">My Wishlist</h1>
          <span className="wishlist-count">{wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="wishlist-grid">
          {wishlistItems.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

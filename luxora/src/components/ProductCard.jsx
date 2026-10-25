import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice } from '../data/products';
import VirtualTryOnButton from './VirtualTryOnButton';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const [hovering, setHovering] = useState(false);
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCart } = useCart();
  const wishlisted = isWishlisted(product.id);

  function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0], product.colors[0]?.name || 'Default');
  }

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  }

  return (
    <div
      className="product-card"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Link to={`/product/${product.id}`} className="product-card-link">
        {/* Image */}
        <div className="product-card-image-wrap">
          <img
            src={product.image}
            alt={product.name}
            className="product-card-img"
          />

          {/* Badges */}
          <div className="product-card-badges">
            {product.isNew && <span className="product-badge product-badge-new">New</span>}
            {product.isBestseller && <span className="product-badge product-badge-best">Bestseller</span>}
          </div>

          {/* Wishlist button */}
          <button
            className={`product-card-wish ${wishlisted ? 'wished' : ''}`}
            onClick={handleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Hover overlay: Quick Add + Try On */}
          <div className={`product-card-overlay ${hovering ? 'visible' : ''}`}>
            <button className="product-card-quick-add" onClick={handleQuickAdd}>
              Quick Add
            </button>
            <VirtualTryOnButton product={product} variant="card" />
          </div>
        </div>

        {/* Info */}
        <div className="product-card-info">
          <h3 className="product-card-name">{product.name}</h3>
          <div className="product-card-price-row">
            <span className="product-card-price">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="product-card-original-price">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {/* Color swatches */}
          {product.colors && product.colors.length > 0 && (
            <div className="product-card-colors">
              {product.colors.map(color => (
                <span
                  key={color.name}
                  className="product-color-swatch"
                  style={{ background: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

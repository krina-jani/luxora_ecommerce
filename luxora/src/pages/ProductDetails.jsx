import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { products, formatPrice } from '../data/products';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import VirtualTryOnButton from '../components/VirtualTryOnButton';
import Footer from '../components/Footer';
import './ProductDetails.css';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find(p => p.id === Number(id));
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || null);
  const [activeImage, setActiveImage] = useState(0);
  const [addedMsg, setAddedMsg] = useState(false);

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>Product not found</h2>
        <Link to="/shop" className="btn btn-dark">Back to Shop</Link>
      </div>
    );
  }

  const wishlisted = isWishlisted(product.id);

  function handleAddToCart() {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    addToCart(product, selectedSize, selectedColor?.name || 'Default');
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  }

  return (
    <div className="product-details-page">
      <div className="product-details-wrapper">
        {/* Left: Images */}
        <div className="product-images-col">
          {/* Main Image */}
          <div className="product-main-image-wrap">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="product-main-img"
            />
          </div>
          {/* Thumbnails */}
          <div className="product-thumbnails">
            {product.images.map((img, i) => (
              <button
                key={i}
                className={`product-thumb ${activeImage === i ? 'active' : ''}`}
                onClick={() => setActiveImage(i)}
              >
                <img src={img} alt={`${product.name} view ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="product-info-col">
          {/* Breadcrumb */}
          <nav className="product-breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to={`/shop?gender=${product.gender}`}>
              {product.gender.charAt(0).toUpperCase() + product.gender.slice(1)}
            </Link>
            <span>›</span>
            <Link to={`/shop?category=${product.category}`}>{product.category}</Link>
          </nav>

          {/* Name + Wishlist */}
          <div className="product-name-row">
            <h1 className="product-name">{product.name.toUpperCase()}</h1>
            <button
              className={`product-wishlist-btn ${wishlisted ? 'wished' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Price */}
          <p className="product-price">{formatPrice(product.price)}</p>

          {/* Color selector */}
          {product.colors.length > 1 && (
            <div className="product-detail-section">
              <div className="product-detail-label">
                COLOR <span className="product-detail-value">{selectedColor?.name}</span>
              </div>
              <div className="product-color-selector">
                {product.colors.map(color => (
                  <button
                    key={color.name}
                    className={`product-color-btn ${selectedColor?.name === color.name ? 'active' : ''}`}
                    style={{ background: color.hex }}
                    title={color.name}
                    onClick={() => setSelectedColor(color)}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div className="product-detail-section">
            <div className="product-detail-label-row">
              <span className="product-detail-label">SIZE</span>
              <a href="#size-guide" className="product-size-guide-link">Size Guide</a>
            </div>
            <div className="product-size-selector">
              {product.sizes.map(size => (
                <button
                  key={size}
                  className={`product-size-btn ${selectedSize === size ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Material */}
          <div className="product-detail-section">
            <span className="product-detail-label">MATERIAL</span>
            <ul className="product-bullet-list">
              {product.material.map((m, i) => (
                <li key={i}>
                  <span className="product-bullet" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div className="product-detail-section">
            <span className="product-detail-label">MORE ABOUT</span>
            <ul className="product-bullet-list">
              {product.features.map((f, i) => (
                <li key={i}>
                  <span className="product-bullet" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Size Guide Table */}
          <div className="product-detail-section" id="size-guide">
            <span className="product-detail-label">SIZE GUIDE</span>
            <table className="product-size-table">
              <thead>
                <tr>
                  <th>SIZE</th>
                  <th>UK</th>
                  <th>US</th>
                </tr>
              </thead>
              <tbody>
                {product.sizeGuide.map(row => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>{row.uk}</td>
                    <td>{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add to Cart */}
          <button
            className={`product-add-to-cart-btn ${addedMsg ? 'added' : ''}`}
            onClick={handleAddToCart}
            id="add-to-cart-btn"
          >
            {addedMsg ? '✓ Added to Bag' : 'ADD TO BAG'}
          </button>

          {/* Virtual Try-On */}
          <VirtualTryOnButton
            product={{ ...product, colors: selectedColor ? [selectedColor, ...product.colors.filter(c => c.name !== selectedColor.name)] : product.colors }}
            variant="detail"
          />

          {/* Description */}
          <p className="product-description">{product.description}</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

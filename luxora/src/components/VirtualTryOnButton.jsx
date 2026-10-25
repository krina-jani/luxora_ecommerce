import { useTryOn } from '../context/TryOnContext';
import './VirtualTryOnButton.css';

/**
 * VirtualTryOnButton
 * ──────────────────
 * Reusable "Try Now" button. Pass the product object.
 * variant: 'card' (compact, overlay) | 'detail' (full-width, prominent)
 */
export default function VirtualTryOnButton({ product, variant = 'card', className = '' }) {
  const { openTryOn } = useTryOn();

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    openTryOn(product);
  }

  if (variant === 'detail') {
    return (
      <button
        className={`tryon-btn-detail ${className}`}
        onClick={handleClick}
        id={`try-on-detail-${product.id}`}
        aria-label={`Virtual try-on for ${product.name}`}
      >
        <span className="tryon-btn-detail-icon">
          {/* Body / garment icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
          </svg>
        </span>
        Virtual Try-On
      </button>
    );
  }

  // Default 'card' variant — compact overlay button
  return (
    <button
      className={`tryon-btn-card ${className}`}
      onClick={handleClick}
      id={`try-on-card-${product.id}`}
      aria-label={`Virtual try-on for ${product.name}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
      Try Now
    </button>
  );
}

import { useTryOn } from '../context/TryOnContext';
import './VirtualTryOnButton.css';

/**
 * VirtualTryOnButton
 * ──────────────────
 * Reusable "Try it on" button matching the Google Shopping experience.
 * variant: 'card' (compact overlay on product image) | 'detail' (prominent button)
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
        <span className="tryon-btn-sparkle">✦</span>
        Try it on
      </button>
    );
  }

  return (
    <button
      className={`tryon-btn-card ${className}`}
      onClick={handleClick}
      id={`try-on-card-${product.id}`}
      aria-label={`Virtual try-on for ${product.name}`}
    >
      <span className="tryon-btn-sparkle">✦</span>
      Try it on
    </button>
  );
}

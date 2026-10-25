import { useTryOn } from '../context/TryOnContext';
import { products } from '../data/products';

export default function SeeAllLooksBanner() {
  const { recentLooks, bannerDismissed, dismissBanner, openTryOn, isOpen } = useTryOn();

  if (isOpen || bannerDismissed || recentLooks.length === 0) return null;

  function handleClick() {
    const latest = recentLooks[0];
    const prod = products.find(p => p.id === latest.productId) || {
      id: latest.productId,
      name: latest.productName,
      price: latest.productPrice,
      image: latest.productImage,
    };
    openTryOn(prod);
  }

  return (
    <div className="vto-floating-looks-banner" onClick={handleClick}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"/>
      </svg>
      <span>See all your looks</span>
      <button
        className="vto-banner-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          dismissBanner();
        }}
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}

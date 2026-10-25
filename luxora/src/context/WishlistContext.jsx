import { createContext, useContext, useState, useCallback } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);

  const addToWishlist = useCallback((product) => {
    setWishlistItems(prev => {
      if (prev.find(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setWishlistItems(prev => prev.filter(p => p.id !== productId));
  }, []);

  const toggleWishlist = useCallback((product) => {
    setWishlistItems(prev => {
      if (prev.find(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  }, []);

  const isWishlisted = useCallback((productId) => {
    return wishlistItems.some(p => p.id === productId);
  }, [wishlistItems]);

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

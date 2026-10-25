import { createContext, useContext, useState } from 'react';

const TryOnContext = createContext(null);

export function TryOnProvider({ children }) {
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [savedPersonPhoto, setSavedPersonPhoto] = useState(null);
  const [savedPersonUrl, setSavedPersonUrl] = useState(null);
  const [savedPersonType, setSavedPersonType] = useState('female_model'); // 'user' | 'female_model' | 'male_model'
  const [recentLooks, setRecentLooks] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  function openTryOn(product) {
    setTryOnProduct(product);
    setIsOpen(true);
    setBannerDismissed(false);
  }

  function closeTryOn() {
    setIsOpen(false);
  }

  function savePersona(file, url, type = 'user') {
    setSavedPersonPhoto(file);
    setSavedPersonUrl(url);
    setSavedPersonType(type);
  }

  function clearPersona() {
    if (savedPersonUrl && savedPersonType === 'user') {
      try { URL.revokeObjectURL(savedPersonUrl); } catch (_) {}
    }
    setSavedPersonPhoto(null);
    setSavedPersonUrl(null);
    setSavedPersonType('female_model');
  }

  function addRecentLook(look) {
    setRecentLooks(prev => {
      const filtered = prev.filter(l => l.productId !== look.productId);
      return [look, ...filtered].slice(0, 10);
    });
  }

  function removeRecentLook(lookId, e) {
    if (e) e.stopPropagation();
    setRecentLooks(prev => prev.filter(l => l.id !== lookId));
  }

  function dismissBanner() {
    setBannerDismissed(true);
  }

  return (
    <TryOnContext.Provider
      value={{
        tryOnProduct,
        isOpen,
        openTryOn,
        closeTryOn,
        savedPersonPhoto,
        savedPersonUrl,
        savedPersonType,
        savePersona,
        clearPersona,
        recentLooks,
        addRecentLook,
        removeRecentLook,
        bannerDismissed,
        dismissBanner,
      }}
    >
      {children}
    </TryOnContext.Provider>
  );
}

export function useTryOn() {
  const ctx = useContext(TryOnContext);
  if (!ctx) throw new Error('useTryOn must be used inside <TryOnProvider>');
  return ctx;
}

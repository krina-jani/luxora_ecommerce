import { createContext, useContext, useState, useEffect } from 'react';

const TryOnContext = createContext(null);

export function TryOnProvider({ children }) {
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [savedPersonPhoto, setSavedPersonPhoto] = useState(null);
  const [savedPersonUrl, setSavedPersonUrl] = useState(null);
  const [savedPersonType, setSavedPersonType] = useState('user'); // 'user' | 'female_model' | 'male_model'
  const [recentLooks, setRecentLooks] = useState([]);

  function openTryOn(product) {
    setTryOnProduct(product);
    setIsOpen(true);
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
    setSavedPersonType('user');
  }

  function addRecentLook(look) {
    setRecentLooks(prev => {
      const filtered = prev.filter(l => l.productId !== look.productId);
      return [look, ...filtered].slice(0, 8);
    });
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


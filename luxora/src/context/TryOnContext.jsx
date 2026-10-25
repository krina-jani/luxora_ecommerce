import { createContext, useContext, useState } from 'react';

const TryOnContext = createContext(null);

export function TryOnProvider({ children }) {
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  function openTryOn(product) {
    setTryOnProduct(product);
    setIsOpen(true);
  }

  function closeTryOn() {
    setIsOpen(false);
    // Small delay before clearing product so exit animation can play
    setTimeout(() => setTryOnProduct(null), 300);
  }

  return (
    <TryOnContext.Provider value={{ tryOnProduct, isOpen, openTryOn, closeTryOn }}>
      {children}
    </TryOnContext.Provider>
  );
}

export function useTryOn() {
  const ctx = useContext(TryOnContext);
  if (!ctx) throw new Error('useTryOn must be used inside <TryOnProvider>');
  return ctx;
}

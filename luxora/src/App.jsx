// LUXORA — App Root (v2)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { TryOnProvider } from './context/TryOnContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import VirtualTryOnModal from './components/VirtualTryOnModal';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';

export default function App() {
  return (
    <BrowserRouter>
      <WishlistProvider>
        <CartProvider>
          <TryOnProvider>
            <Navbar />
            <CartDrawer />
            {/* Virtual Try-On modal — rendered globally, triggered by any product */}
            <VirtualTryOnModal />
            <Routes>
              <Route path="/"           element={<Home />} />
              <Route path="/shop"       element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart"       element={<Cart />} />
              <Route path="/checkout"   element={<Checkout />} />
              <Route path="/wishlist"   element={<Wishlist />} />
            </Routes>
          </TryOnProvider>
        </CartProvider>
      </WishlistProvider>
    </BrowserRouter>
  );
}

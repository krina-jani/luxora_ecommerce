import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import Footer from '../components/Footer';
import { products, categories } from '../data/products';
import { Link } from 'react-router-dom';
import './Home.css';

const featuredProducts = products.slice(0, 4);

// ── Swapping text content for the banner ──────────────
const SWAP_LABELS = [
  { tag: 'New In', color: '#C9A96E' },
  { tag: 'Just Dropped', color: '#A8C5A0' },
  { tag: 'This Season', color: '#C9A96E' },
  { tag: 'Exclusive Edit', color: '#B8A8C8' },
];

const SWAP_HEADLINES = [
  'The New Arrivals',
  'Fresh Perspectives',
  'Autumn Essentials',
  'Curated for You',
];

const SWAP_SUBS = [
  'The latest additions to our curated collection.',
  'Effortless pieces that define the season.',
  'Luxury crafted for the modern wardrobe.',
  'Thoughtfully selected. Beautifully made.',
];

function useSwap(items, interval = 2500) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % items.length);
        setVisible(true);
      }, 350);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  return { item: items[index], visible };
}

export default function Home() {
  const label   = useSwap(SWAP_LABELS, 2500);
  const headline = useSwap(SWAP_HEADLINES, 2500);
  const sub      = useSwap(SWAP_SUBS, 2500);

  return (
    <div className="home-page">
      {/* Hero */}
      <Hero />

      {/* Shop by Category Section */}
      <section className="home-shop-section" id="shop-by-category">
        <div className="home-shop-inner">
          {/* Sidebar */}
          <aside className="shop-sidebar">
            <h2 className="shop-sidebar-title">Shop by Category</h2>
            <ul className="shop-sidebar-list">
              {categories.map((cat, i) => (
                <li key={cat}>
                  <Link
                    to={`/shop?category=${cat}`}
                    className={`shop-sidebar-link ${i === 0 ? 'active' : ''}`}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/shop" className="shop-sidebar-view-all">VIEW ALL</Link>
          </aside>

          {/* Product Grid */}
          <div className="shop-products-area">
            <ProductGrid products={featuredProducts} columns={4} />
          </div>
        </div>
      </section>

      {/* ── New Arrivals Banner with Swapping Text ── */}
      <section className="home-new-arrivals">
        <div className="home-new-arrivals-inner">

          {/* Swap section 1 — Label tag */}
          <p
            className={`swap-label ${label.visible ? 'swap-in' : 'swap-out'}`}
            style={{ color: label.item.color }}
          >
            {label.item.tag}
          </p>

          {/* Swap section 2 — Headline */}
          <h2 className={`section-title swap-headline ${headline.visible ? 'swap-in' : 'swap-out'}`}>
            {headline.item}
          </h2>

          {/* Swap section 3 — Sub copy */}
          <p className={`home-new-arrivals-sub swap-sub ${sub.visible ? 'swap-in' : 'swap-out'}`}>
            {sub.item}
          </p>

          <Link to="/shop?filter=new" className="btn btn-outline-dark" id="view-new-btn">
            Explore New Arrivals
          </Link>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="home-bestsellers" id="bestsellers">
        <div className="home-section-header">
          <p className="section-label">Most Loved</p>
          <h2 className="home-section-title serif">Bestsellers</h2>
        </div>
        <div className="container">
          <ProductGrid products={products.filter(p => p.isBestseller)} columns={4} />
        </div>
      </section>

      <Footer />
    </div>
  );
}

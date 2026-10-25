import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { products, categories } from '../data/products';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import './Shop.css';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

const subcategories = {
  Outerwear: ['Coats', 'Jackets', 'Blazers'],
  Knitwear: ['Sweaters', 'Cardigans', 'Turtlenecks'],
  Tailoring: ['Blazers', 'Trousers', 'Suits'],
  Shirts: ['Casual', 'Formal', 'Silk'],
  Trousers: ['Wide Leg', 'Straight', 'Tailored'],
  Accessories: ['Bags', 'Belts', 'Scarves'],
  Footwear: ['Heels', 'Flats', 'Boots'],
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState('featured');
  const [expandedCategory, setExpandedCategory] = useState(searchParams.get('category') || null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [priceMax, setPriceMax] = useState(80000);

  const activeCategory = searchParams.get('category') || null;
  const activeGender = searchParams.get('gender') || null;
  const filterNew = searchParams.get('filter') === 'new';

  function setCategory(cat) {
    const params = new URLSearchParams(searchParams);
    if (activeCategory === cat) {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
    setSearchParams(params);
    setExpandedCategory(expandedCategory === cat ? null : cat);
  }

  function setGender(g) {
    const params = new URLSearchParams(searchParams);
    if (activeGender === g) {
      params.delete('gender');
    } else {
      params.set('gender', g);
    }
    setSearchParams(params);
  }

  const filtered = useMemo(() => {
    let result = [...products];
    if (activeCategory) result = result.filter(p => p.category === activeCategory);
    if (activeGender) result = result.filter(p => p.gender === activeGender);
    if (filterNew) result = result.filter(p => p.isNew);
    result = result.filter(p => p.price <= priceMax);
    switch (sort) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'newest': result = result.filter(p => p.isNew).concat(result.filter(p => !p.isNew)); break;
      default: break;
    }
    return result;
  }, [activeCategory, activeGender, filterNew, sort, priceMax]);

  const pageTitle = activeGender
    ? `${activeGender.charAt(0).toUpperCase() + activeGender.slice(1)}'s Clothing`
    : activeCategory || "All Products";

  return (
    <div className="shop-page">
      {/* Page Header */}
      <div className="shop-page-header">
        <div className="shop-page-header-inner">
          <div className="shop-page-header-left">
            <h1 className="shop-page-title serif">{pageTitle}</h1>
            <p className="shop-breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              {activeGender && <><span>{activeGender}</span><span>/</span></>}
              {activeCategory && <span>{activeCategory}</span>}
              {!activeGender && !activeCategory && <span>All</span>}
            </p>
          </div>

          {/* Category Image Strip */}
          <div className="shop-category-strip">
            {categories.slice(0, 4).map(cat => (
              <button
                key={cat}
                className={`shop-cat-strip-item ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shop-layout">
        {/* Sidebar Filters */}
        <aside className="shop-filters-sidebar">
          {/* Gender Filter */}
          <div className="filter-section">
            <h3 className="filter-section-title">Gender</h3>
            {['women', 'men'].map(g => (
              <button
                key={g}
                className={`filter-gender-btn ${activeGender === g ? 'active' : ''}`}
                onClick={() => setGender(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="filter-section">
            {categories.map(cat => (
              <div key={cat} className="filter-category-group">
                <button
                  className={`filter-category-main ${activeCategory === cat ? 'filter-active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  <span>{cat}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ transform: expandedCategory === cat ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedCategory === cat && subcategories[cat] && (
                  <ul className="filter-subcategory-list">
                    {subcategories[cat].map(sub => (
                      <li key={sub}>
                        <button className="filter-subcategory-item">
                          <span className="filter-diamond">◆</span>
                          {sub}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <h3 className="filter-section-title">Price Range</h3>
            <div className="price-range-labels">
              <span>₹0</span>
              <span>₹{priceMax.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={80000}
              step={1000}
              value={priceMax}
              onChange={e => setPriceMax(Number(e.target.value))}
              className="price-range-input"
            />
          </div>

          {/* Filter by Designer */}
          <div className="filter-section">
            <h3 className="filter-section-title">Filter by Designer</h3>
            <div className="designer-search">
              <input type="text" placeholder="Search designer..." className="form-input" />
              <button className="designer-search-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="shop-main">
          {/* Sort & Count Bar */}
          <div className="shop-sort-bar">
            <div className="sort-dropdown-wrap">
              <button
                className="sort-btn"
                onClick={() => setShowSortMenu(!showSortMenu)}
                id="sort-btn"
              >
                SORT BY
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showSortMenu && (
                <div className="sort-menu">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`sort-menu-item ${sort === opt.value ? 'active' : ''}`}
                      onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="shop-items-count">{filtered.length} ITEMS</span>
          </div>

          {/* Product Grid */}
          {filtered.length === 0 ? (
            <div className="shop-empty">
              <p>No products found. Try adjusting your filters.</p>
              <button
                className="btn btn-outline-dark"
                onClick={() => { setSearchParams({}); setPriceMax(80000); }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="shop-product-grid">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

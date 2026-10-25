import ProductCard from './ProductCard';
import './ProductGrid.css';

export default function ProductGrid({ products, columns = 4 }) {
  return (
    <div
      className="product-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

import heroBanner from '../assets/hero_banner.png';
import productCoat from '../assets/product_coat.png';
import productJacket from '../assets/product_jacket.png';
import productKnit from '../assets/product_knit.png';
import productShirt from '../assets/product_shirt.png';
import productBlazer from '../assets/product_blazer.png';
import productTrousers from '../assets/product_trousers.png';
import productBag from '../assets/product_bag.png';
import productCashmere from '../assets/product_cashmere.png';

export { heroBanner };

export const products = [
  {
    id: 1,
    name: 'Oversized Wool Coat',
    price: 57999,
    originalPrice: null,
    category: 'Outerwear',
    gender: 'women',
    colors: [
      { name: 'Stone', hex: '#C4B5A5' },
      { name: 'Cream', hex: '#EDE8E0' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    image: productCoat,
    images: [productCoat, productCoat, productCoat, productCoat],
    description:
      'A timeless oversized coat in premium wool blend. Featuring a relaxed silhouette, notched lapels and deep side pockets. Crafted for enduring style across every season.',
    material: ['100% Wool outer', 'Fully lined in silk blend'],
    features: ['Oversized relaxed fit', 'Notched lapels', 'Deep side pockets', 'Single button closure'],
    sizeGuide: [
      { size: 'XS', uk: '6', us: '2' },
      { size: 'S', uk: '8', us: '4' },
      { size: 'M', uk: '10', us: '6' },
      { size: 'L', uk: '12', us: '8' },
      { size: 'XL', uk: '14', us: '10' },
    ],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 2,
    name: 'Double-Faced Jacket',
    price: 57999,
    originalPrice: null,
    category: 'Tailoring',
    gender: 'men',
    colors: [
      { name: 'Charcoal', hex: '#4A4A4A' },
      { name: 'Black', hex: '#1A1A1A' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: productJacket,
    images: [productJacket, productJacket, productJacket, productJacket],
    description:
      'Crafted from double-faced fabric, this structured jacket offers refined tailoring with modern proportions. A wardrobe investment that transcends seasons.',
    material: ['70% Wool, 30% Cashmere', 'Unlined construction'],
    features: ['Double-faced fabric', 'Structured shoulders', 'Welt pockets', 'Single button closure'],
    sizeGuide: [
      { size: 'S', uk: '36', us: '36' },
      { size: 'M', uk: '38', us: '38' },
      { size: 'L', uk: '40', us: '40' },
      { size: 'XL', uk: '42', us: '42' },
    ],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 3,
    name: 'Silk Relaxed Shirt',
    price: 26999,
    originalPrice: null,
    category: 'Shirts',
    gender: 'women',
    colors: [
      { name: 'Sand', hex: '#C8B99A' },
      { name: 'Ivory', hex: '#F2EDE5' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    image: productShirt,
    images: [productShirt, productShirt, productShirt, productShirt],
    description:
      'An effortlessly relaxed shirt in pure mulberry silk. Fluid and lightweight with a generous fit. The epitome of understated luxury.',
    material: ['100% Mulberry Silk'],
    features: ['Relaxed generous fit', 'Point collar', 'Mother of pearl buttons', 'Curved hem'],
    sizeGuide: [
      { size: 'XS', uk: '6', us: '2' },
      { size: 'S', uk: '8', us: '4' },
      { size: 'M', uk: '10', us: '6' },
      { size: 'L', uk: '12', us: '8' },
    ],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 4,
    name: 'Lightweight Knit',
    price: 24499,
    originalPrice: null,
    category: 'Knitwear',
    gender: 'men',
    colors: [
      { name: 'Oat', hex: '#D4C4A8' },
      { name: 'Stone', hex: '#9E9488' },
      { name: 'Navy', hex: '#1E2D4A' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    image: productKnit,
    images: [productKnit, productKnit, productKnit, productKnit],
    description:
      'A finely knit sweater in extra fine merino wool. The perfect layering piece for any occasion — effortlessly refined.',
    material: ['100% Extra Fine Merino Wool'],
    features: ['Regular fit', 'Crew neck', 'Ribbed cuffs and hem', 'Machine washable'],
    sizeGuide: [
      { size: 'S', uk: '36', us: '36' },
      { size: 'M', uk: '38', us: '38' },
      { size: 'L', uk: '40', us: '40' },
      { size: 'XL', uk: '42', us: '42' },
    ],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 5,
    name: 'Tailored Linen Blazer',
    price: 36999,
    originalPrice: null,
    category: 'Tailoring',
    gender: 'women',
    colors: [
      { name: 'Beige', hex: '#D4C4A8' },
      { name: 'White', hex: '#F0EDE8' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    image: productBlazer,
    images: [productBlazer, productBlazer, productBlazer, productBlazer],
    description:
      'A perfectly tailored blazer in pure linen. An elevated wardrobe essential that speaks to quiet confidence.',
    material: ['100% Linen', 'Cupro lining'],
    features: ['Slim tailored fit', 'Peak lapels', 'Flap pockets', 'Single button'],
    sizeGuide: [
      { size: 'XS', uk: '6', us: '2' },
      { size: 'S', uk: '8', us: '4' },
      { size: 'M', uk: '10', us: '6' },
      { size: 'L', uk: '12', us: '8' },
    ],
    isNew: false,
    isBestseller: false,
  },
  {
    id: 6,
    name: 'Wide Leg Trousers',
    price: 23699,
    originalPrice: null,
    category: 'Trousers',
    gender: 'women',
    colors: [
      { name: 'Cream', hex: '#EDE8E0' },
      { name: 'Camel', hex: '#C8A882' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    image: productTrousers,
    images: [productTrousers, productTrousers, productTrousers, productTrousers],
    description:
      'High-rise wide leg trousers with fluid drape. An essential for a refined wardrobe — sophisticated in every movement.',
    material: ['65% Polyester, 35% Viscose'],
    features: ['High rise waist', 'Wide leg silhouette', 'Side zip closure', 'Pressed crease'],
    sizeGuide: [
      { size: 'XS', uk: '6', us: '2' },
      { size: 'S', uk: '8', us: '4' },
      { size: 'M', uk: '10', us: '6' },
      { size: 'L', uk: '12', us: '8' },
    ],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 7,
    name: 'Structured Leather Bag',
    price: 41999,
    originalPrice: null,
    category: 'Accessories',
    gender: 'women',
    colors: [
      { name: 'Cognac', hex: '#8B5E3C' },
      { name: 'Black', hex: '#1A1A1A' },
    ],
    sizes: ['One Size'],
    image: productBag,
    images: [productBag, productBag, productBag, productBag],
    description:
      'A structured top-handle bag in full-grain calf leather. Features polished gold-tone hardware and a detachable shoulder strap.',
    material: ['Full-grain calf leather', 'Suede interior lining'],
    features: ['Top handle carry', 'Detachable strap', 'Gold-tone hardware', 'Interior zip pocket'],
    sizeGuide: [
      { size: 'One Size', uk: '—', us: '—' },
    ],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 8,
    name: 'Cashmere Turtleneck',
    price: 32999,
    originalPrice: null,
    category: 'Knitwear',
    gender: 'women',
    colors: [
      { name: 'Camel', hex: '#C8A882' },
      { name: 'Ivory', hex: '#F2EDE5' },
      { name: 'Black', hex: '#1A1A1A' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    image: productCashmere,
    images: [productCashmere, productCashmere, productCashmere, productCashmere],
    description:
      'A luxuriously soft turtleneck knitted from pure Grade A Scottish cashmere. The ultimate expression of refined comfort.',
    material: ['100% Grade A Cashmere'],
    features: ['Regular fit', 'Roll neck collar', 'Ribbed cuffs and hem', 'Dry clean only'],
    sizeGuide: [
      { size: 'XS', uk: '6', us: '2' },
      { size: 'S', uk: '8', us: '4' },
      { size: 'M', uk: '10', us: '6' },
      { size: 'L', uk: '12', us: '8' },
    ],
    isNew: false,
    isBestseller: true,
  },
];

export const categories = ['Outerwear', 'Tailoring', 'Knitwear', 'Shirts', 'Trousers', 'Accessories', 'Footwear'];
export const genders = ['women', 'men'];

// Helper to format INR price
export function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

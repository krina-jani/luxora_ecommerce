import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import heroSlide1 from '../assets/hero_slide1.png';
import heroSlide2 from '../assets/hero_slide2.png';
import heroSlide3 from '../assets/hero_slide3.png';
import heroSlide4 from '../assets/hero_slide4.png';
import './Hero.css';

const slides = [
  {
    image: heroSlide1,
    objectPosition: 'center 20%',
    season: 'Spring / Summer 2025',
    headline: <>Timeless Design.<br />Modern Essence.</>,
    sub: <>Discover effortless pieces<br />crafted for a life well-lived.</>,
  },
  {
    image: heroSlide2,
    objectPosition: 'center 15%',
    season: 'New Collection',
    headline: <>Elegance in<br />Every Detail.</>,
    sub: <>Where luxury meets<br />everyday confidence.</>,
  },
  {
    image: heroSlide3,
    objectPosition: 'center 10%',
    season: 'Autumn / Winter 2025',
    headline: <>Bold Lines.<br />Quiet Power.</>,
    sub: <>Tailored for those who<br />define their own aesthetic.</>,
  },
  {
    image: heroSlide4,
    objectPosition: 'center 15%',
    season: 'Festive Edit',
    headline: <>Grace Beyond<br />Measure.</>,
    sub: <>Curated luxury for<br />India's finest moments.</>,
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % slides.length);
        setFading(false);
      }, 400);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  function goTo(idx) {
    if (idx === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 400);
  }

  const slide = slides[current];

  return (
    <section className="hero-section" id="hero">
      {/* Background Images — each stacked, only active visible */}
      <div className="hero-image-wrap">
        {slides.map((s, i) => (
          <img
            key={i}
            src={s.image}
            alt={`LUXORA collection ${i + 1}`}
            className={`hero-bg-img ${i === current ? 'hero-img-active' : ''}`}
            style={{ objectPosition: s.objectPosition }}
          />
        ))}
        <div className="hero-overlay" />
      </div>

      {/* Content */}
      <div className={`hero-content ${fading ? 'hero-content-fade' : ''}`}>
        <div className="hero-text">
          <p className="hero-season">{slide.season}</p>
          <h1 className="hero-headline">{slide.headline}</h1>
          <p className="hero-subtext">{slide.sub}</p>
          <div className="hero-buttons">
            <Link to="/shop?gender=women" className="btn btn-dark" id="shop-women-btn">Shop Women</Link>
            <Link to="/shop?gender=men" className="btn btn-outline" id="shop-men-btn">Shop Men</Link>
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        className="hero-arrow hero-arrow-prev"
        onClick={() => goTo((current - 1 + slides.length) % slides.length)}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        className="hero-arrow hero-arrow-next"
        onClick={() => goTo((current + 1) % slides.length)}
        aria-label="Next slide"
      >
        ›
      </button>

      {/* Progress bar */}
      <div className="hero-progress">
        <div key={current} className="hero-progress-bar" />
      </div>
    </section>
  );
}

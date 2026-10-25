import { useState, useRef, useEffect } from 'react';
import { useTryOn } from '../context/TryOnContext';
import { useCart } from '../context/CartContext';
import { runVirtualTryOn } from '../services/virtualTryOnService';
import { formatPrice } from '../data/products';
import modelFemaleDefault from '../assets/model_female.jpg';
import modelMaleDefault from '../assets/model_male.jpg';
import './VirtualTryOnModal.css';

/* ─── Virtual Try-On Steps ──────────────────────────────────── */
const STEP = {
  INITIAL:    'INITIAL',    // Model display + "Try on you" / Model options
  CAMERA:     'CAMERA',     // Live camera viewfinder
  PROCESSING: 'PROCESSING', // Ethereal pastel aurora loading screen
  RESULT:     'RESULT',     // The generated look + floating action buttons
};

const MAX_MB  = 12;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (!ALLOWED.includes(file.type)) return 'Please upload a JPG, PNG, or WebP image.';
  if (file.size > MAX_MB * 1024 * 1024) return `Image must be under ${MAX_MB} MB.`;
  return null;
}

export default function VirtualTryOnModal() {
  const {
    isOpen,
    tryOnProduct,
    closeTryOn,
    savedPersonPhoto,
    savedPersonUrl,
    savePersona,
    recentLooks,
    addRecentLook,
    removeRecentLook,
  } = useTryOn();

  const { addToCart } = useCart();

  const [step,               setStep]               = useState(STEP.INITIAL);
  const [customerFile,       setCustomerFile]       = useState(null);
  const [customerPreviewUrl, setCustomerPreviewUrl] = useState(null);
  const [customerType,       setCustomerType]       = useState('female_model'); // 'user' | 'female_model' | 'male_model'
  const [generatedResultUrl, setGeneratedResultUrl] = useState(null);
  const [generationError,    setGenerationError]    = useState('');
  const [selectedSize,       setSelectedSize]       = useState('M');
  const [selectedColor,      setSelectedColor]      = useState('');
  const [addedToBag,         setAddedToBag]         = useState(false);
  const [showPicker,         setShowPicker]         = useState(false); // Bottom sheet: Choose an action
  const [loadStage,          setLoadStage]          = useState(0);     // 0: Creating, 1: Almost there, 2: Final touches
  const [stream,             setStream]             = useState(null);
  const [showShopDrawer,     setShowShopDrawer]     = useState(false);
  const [isBookmarked,       setIsBookmarked]       = useState(false);
  const [toastMessage,       setToastMessage]       = useState('');

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const fileInputRef  = useRef(null);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }

  /* ── Initialize when modal opens or product changes ────────── */
  useEffect(() => {
    if (!isOpen || !tryOnProduct) return;
    setAddedToBag(false);
    setGenerationError('');
    setShowPicker(false);
    setShowShopDrawer(false);
    setIsBookmarked(false);
    setSelectedSize(tryOnProduct.sizes?.[0] ?? 'M');
    setSelectedColor(tryOnProduct.colors?.[0]?.name ?? 'Standard');

    // Check if this product was already generated
    const existing = recentLooks.find(l => l.productId === tryOnProduct.id);
    if (existing && existing.resultUrl) {
      setGeneratedResultUrl(existing.resultUrl);
      if (existing.personUrl) setCustomerPreviewUrl(existing.personUrl);
      setStep(STEP.RESULT);
    } else if (savedPersonPhoto && savedPersonUrl) {
      // Saved persona exists — immediately trigger generation for this new garment!
      setCustomerFile(savedPersonPhoto);
      setCustomerPreviewUrl(savedPersonUrl);
      executeGeneration(savedPersonPhoto, savedPersonUrl, tryOnProduct);
    } else {
      // Default: show neutral female model (matching video 00:03)
      setCustomerPreviewUrl(modelFemaleDefault);
      setCustomerType('female_model');
      setStep(STEP.INITIAL);
    }
  }, [isOpen, tryOnProduct]); // eslint-disable-line

  /* ── Body scroll lock ─────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* ── Camera Stream Attach ─────────────────────────────────── */
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  /* ── Phased loading text updates (Creating -> Almost there -> Final touches) ── */
  useEffect(() => {
    if (step === STEP.PROCESSING) {
      setLoadStage(0);
      const t1 = setTimeout(() => setLoadStage(1), 2200);
      const t2 = setTimeout(() => setLoadStage(2), 4800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [step]);

  /* ── Camera Handlers ──────────────────────────────────────── */
  async function startCamera() {
    setShowPicker(false);
    setGenerationError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(s);
      setStep(STEP.CAMERA);
    } catch {
      setGenerationError('Camera access unavailable. Please upload a photo from files.');
      setStep(STEP.INITIAL);
    }
  }

  function stopCamera() {
    setStream(prev => { prev?.getTracks().forEach(t => t.stop()); return null; });
  }

  function capturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
      stopCamera();
      const previewUrl = URL.createObjectURL(file);
      setCustomerFile(file);
      setCustomerPreviewUrl(previewUrl);
      setCustomerType('user');
      savePersona(file, previewUrl, 'user');
      // Directly start try-on generation!
      executeGeneration(file, previewUrl, tryOnProduct);
    }, 'image/jpeg', 0.92);
  }

  /* ── File / Gallery Upload ────────────────────────────────── */
  function handleFileSelect(e) {
    setShowPicker(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setGenerationError(err); return; }
    const previewUrl = URL.createObjectURL(file);
    setCustomerFile(file);
    setCustomerPreviewUrl(previewUrl);
    setCustomerType('user');
    savePersona(file, previewUrl, 'user');
    // Directly start try-on generation!
    executeGeneration(file, previewUrl, tryOnProduct);
    e.target.value = '';
  }

  /* ── Studio Models Selection ──────────────────────────────── */
  async function selectStudioModel(type) {
    setShowPicker(false);
    const modelAsset = type === 'male' ? modelMaleDefault : modelFemaleDefault;
    try {
      const res = await fetch(modelAsset);
      const blob = await res.blob();
      const file = new File([blob], `${type}_model.jpg`, { type: 'image/jpeg' });
      setCustomerFile(file);
      setCustomerPreviewUrl(modelAsset);
      setCustomerType(`${type}_model`);
      savePersona(file, modelAsset, `${type}_model`);
      // Directly start try-on generation!
      executeGeneration(file, modelAsset, tryOnProduct);
    } catch {
      setGenerationError('Could not load studio model photo.');
    }
  }

  /* ── Direct Generation Pipeline ───────────────────────────── */
  async function executeGeneration(photoFile, previewUrl, product) {
    if (!photoFile || !product) return;
    setStep(STEP.PROCESSING);
    setGenerationError('');

    try {
      const res = await runVirtualTryOn({
        personPhoto:     photoFile,
        productImageSrc: product.image,
        productId:       product.id,
        productCategory: product.category,
        productColor:    selectedColor,
        productName:     product.name,
        consent:         true,
      });

      if (!res?.resultUrl) {
        throw new Error('AI engine returned empty response.');
      }

      // Preload image before revealing
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Graceful continue
        img.src = res.resultUrl;
      });

      setGeneratedResultUrl(res.resultUrl);
      setStep(STEP.RESULT);

      // Save to recent looks history
      addRecentLook({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        resultUrl: res.resultUrl,
        personUrl: previewUrl,
      });
    } catch (err) {
      setGenerationError(err.message || 'Virtual try-on generation failed. Please try again.');
      setStep(STEP.INITIAL);
    }
  }

  /* ── Add to Cart ─────────────────────────────────────────── */
  function handleAddToBag() {
    if (!tryOnProduct || !selectedSize) return;
    addToCart(tryOnProduct, selectedSize, selectedColor);
    setAddedToBag(true);
    showToast('✓ Added to Bag');
    setTimeout(() => setAddedToBag(false), 2400);
  }

  /* ── Share Look ──────────────────────────────────────────── */
  async function handleShare() {
    if (navigator.share && generatedResultUrl) {
      try {
        await navigator.share({
          title: `My ${tryOnProduct?.name} Try-On Look`,
          text: `Check out how I look in the ${tryOnProduct?.name} on LUXORA!`,
          url: window.location.href,
        });
        return;
      } catch (_) {}
    }
    // Fallback: Copy current link
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    } catch {
      showToast('Shared look!');
    }
  }

  /* ── Bookmark / Save Look ────────────────────────────────── */
  function handleBookmark() {
    setIsBookmarked(prev => !prev);
    showToast(!isBookmarked ? 'Look saved to your collection!' : 'Removed from collection');
  }

  if (!isOpen || !tryOnProduct) return null;

  const STAGE_TEXTS = [
    'Creating the look…',
    'Almost there…',
    'Adding the final touches…',
  ];

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Dimmed backdrop */}
      <div className="vto-backdrop vto-open" onClick={closeTryOn} aria-hidden="true" />

      {/* Main Drawer Shell */}
      <div className="vto-panel vto-open" role="dialog" aria-modal="true" aria-label="Virtual Try-On">

        {/* ── Toast Alert ──────────────────────────────────── */}
        {toastMessage && (
          <div className="vto-toast-pill">{toastMessage}</div>
        )}

        {/* ── Top Floating Header (Back / Close) ───────────── */}
        <div className="vto-header">
          <button className="vto-circle-back-btn" onClick={closeTryOn} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* User circular avatar in top right (video 00:16 & 00:36) */}
          {customerPreviewUrl && step !== STEP.CAMERA && (
            <div
              className="vto-user-avatar"
              title="Change your try-on photo"
              onClick={() => setShowPicker(true)}
            >
              <img src={customerPreviewUrl} alt="Persona" />
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 1: INITIAL VIEW (Clean Model + Action Buttons)
            (Matches Google Shopping video 00:03 - 00:05)
            ════════════════════════════════════════════════════ */}
        {step === STEP.INITIAL && (
          <div className="vto-initial-view">
            {/* Full body clean model photo */}
            <div className="vto-stage-img-wrap">
              <img
                src={customerPreviewUrl || modelFemaleDefault}
                alt="Model"
                className="vto-stage-img"
              />
            </div>

            {/* Google Shopping Action Buttons */}
            <div className="vto-actions-card">
              {generationError && (
                <div className="vto-error-banner">{generationError}</div>
              )}

              {/* Primary Blue Button: Try on you */}
              <button
                className="vto-btn-primary"
                onClick={() => setShowPicker(true)}
                id="vto-try-on-you-btn"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {savedPersonPhoto ? 'Try on your photo' : 'Try on you'}
              </button>

              {/* Secondary Button: Female Model */}
              <button
                className="vto-btn-secondary"
                onClick={() => selectStudioModel('female')}
                id="vto-female-model-btn"
              >
                Try on a female model
              </button>

              {/* Secondary Button: Male Model */}
              <button
                className="vto-btn-secondary"
                onClick={() => selectStudioModel('male')}
                id="vto-male-model-btn"
              >
                Try on a male model
              </button>

              <p className="vto-legal-disclaimer">
                Only upload a photo of yourself. Google&apos;s Generative AI Prohibited Use Policy and Privacy Policy applies. Resulting AI images may include mistakes. <span className="vto-disclaimer-link">Learn more</span>
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            LIVE CAMERA CAPTURE
            ════════════════════════════════════════════════════ */}
        {step === STEP.CAMERA && (
          <div className="vto-camera-view">
            <video ref={videoRef} autoPlay playsInline muted className="vto-camera-feed" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="vto-camera-overlay">
              <div className="vto-camera-frame" />
            </div>
            <div className="vto-camera-bar">
              <button className="vto-shutter-ring" onClick={capturePhoto} aria-label="Take Photo">
                <span className="vto-shutter-dot" />
              </button>
              <button className="vto-cancel-cam-btn" onClick={() => { stopCamera(); setStep(STEP.INITIAL); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP PROCESSING: ETHEREAL PASTEL AURORA LOADER
            (Matches Google Shopping video 00:15 - 00:35)
            ════════════════════════════════════════════════════ */}
        {step === STEP.PROCESSING && (
          <div className="vto-loading-view">
            <div className="vto-aurora-bg" />
            <div className="vto-loading-content">
              {/* Spinning Google-style Sparkle Star */}
              <div className="vto-sparkle-loader">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"/>
                  <path d="M19 18L17.5 14.5L14 13L17.5 11.5L19 8L20.5 11.5L24 13L20.5 14.5L19 18Z" opacity="0.7"/>
                </svg>
              </div>

              {/* Dynamic 3-stage animated headline */}
              <h2 className="vto-loading-text">{STAGE_TEXTS[loadStage]}</h2>

              <p className="vto-loading-sub">
                AI images may include mistakes.<br />
                Fit and appearance will not be exact.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP RESULT: THE LOOK (Full Coherent Result Screen)
            (Matches Google Shopping video 00:36 - 00:41 & 01:01)
            ════════════════════════════════════════════════════ */}
        {step === STEP.RESULT && generatedResultUrl && (
          <div className="vto-result-view">
            {/* Fitted Result Canvas */}
            <div className="vto-result-canvas">
              <img
                src={generatedResultUrl}
                alt={`${tryOnProduct.name} Try-On Result`}
                className="vto-result-img"
              />

              {/* Floating Action Buttons on Right (video 00:36) */}
              <div className="vto-float-actions">
                <button
                  className="vto-action-circle"
                  onClick={handleShare}
                  title="Share Look"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>

                <button
                  className={`vto-action-circle ${isBookmarked ? 'bookmarked' : ''}`}
                  onClick={handleBookmark}
                  title="Save Look"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>

                <button
                  className="vto-action-circle"
                  onClick={() => setShowPicker(true)}
                  title="Change Photo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>

                <div className="vto-ai-badge-circle" title="Generated with AI">
                  <span>ai</span>
                </div>
              </div>

              {/* Bottom "Shop" button on the left (video 00:36) */}
              <div className="vto-bottom-left-bar">
                <button
                  className="vto-shop-pill-btn"
                  onClick={() => setShowShopDrawer(prev => !prev)}
                >
                  Shop
                </button>
              </div>

              {/* Shop Details Slide-up Drawer */}
              {showShopDrawer && (
                <div className="vto-shop-drawer">
                  <div className="vto-shop-drawer-header">
                    <div>
                      <h4 className="vto-shop-name">{tryOnProduct.name}</h4>
                      <p className="vto-shop-price">{formatPrice(tryOnProduct.price)}</p>
                    </div>
                    <button className="vto-shop-close-btn" onClick={() => setShowShopDrawer(false)}>✕</button>
                  </div>

                  <div className="vto-size-chips">
                    {['XS', 'S', 'M', 'L', 'XL'].map(s => (
                      <button
                        key={s}
                        className={`vto-chip ${selectedSize === s ? 'active' : ''}`}
                        onClick={() => setSelectedSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <button
                    className={`vto-add-bag-btn ${addedToBag ? 'added' : ''}`}
                    onClick={handleAddToBag}
                  >
                    {addedToBag ? '✓ Added to Bag' : 'Add to Bag'}
                  </button>
                </div>
              )}
            </div>

            {/* ── RECENTLY TRIED TRAY (Matches video 00:39 & 01:01) ── */}
            {recentLooks.length > 0 && (
              <div className="vto-recent-tray">
                <div className="vto-recent-header">
                  <p className="vto-recent-title">Recently tried</p>
                </div>
                <div className="vto-recent-scroll">
                  {recentLooks.map(look => (
                    <div
                      key={look.id}
                      className={`vto-recent-card ${look.resultUrl === generatedResultUrl ? 'active' : ''}`}
                      onClick={() => setGeneratedResultUrl(look.resultUrl)}
                    >
                      <img src={look.resultUrl} alt={look.productName} className="vto-recent-thumb" />
                      <button
                        className="vto-recent-remove-btn"
                        onClick={(e) => removeRecentLook(look.id, e)}
                        title="Remove look"
                        aria-label="Remove look"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <p className="vto-footer-feedback">
                  AI images may include mistakes. <span className="vto-feedback-link">Give feedback</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            BOTTOM SHEET: CHOOSE AN ACTION (Camera vs Camcorder vs Files)
            (Matches Google Shopping video 00:06 - 00:08)
            ════════════════════════════════════════════════════ */}
        {showPicker && (
          <div className="vto-picker-backdrop" onClick={() => setShowPicker(false)}>
            <div className="vto-picker-sheet" onClick={e => e.stopPropagation()}>
              <h3 className="vto-picker-title">Choose an action</h3>
              <div className="vto-picker-grid">
                {/* 1. Camera Option */}
                <div className="vto-picker-item" onClick={startCamera}>
                  <div className="vto-picker-icon camera">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <span>Camera</span>
                </div>

                {/* 2. Camera Camcorder Option */}
                <div className="vto-picker-item" onClick={startCamera}>
                  <div className="vto-picker-icon camcorder">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <span>Camera<br/>Camcorder</span>
                </div>

                {/* 3. Files / Gallery Option */}
                <div className="vto-picker-item" onClick={() => fileInputRef.current?.click()}>
                  <div className="vto-picker-icon files">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                  </div>
                  <span>Files</span>
                </div>
              </div>

              {/* Hidden file input for gallery upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

      </div>
    </>
  );
}

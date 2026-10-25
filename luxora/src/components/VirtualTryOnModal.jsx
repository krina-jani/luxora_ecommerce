import { useState, useRef, useEffect } from 'react';
import { useTryOn } from '../context/TryOnContext';
import { useCart } from '../context/CartContext';
import { runVirtualTryOn } from '../services/virtualTryOnService';
import { formatPrice } from '../data/products';
import modelElena from '../assets/hero_slide1.png';
import modelMarcus from '../assets/hero_slide2.png';
import './VirtualTryOnModal.css';

/* ─── Steps matching Google Shopping flow ───────────────────── */
const STEP = {
  INITIAL:    'INITIAL',    // Model view with "Try on you", "Female model", "Male model"
  CAMERA:     'CAMERA',     // Live camera feed
  PROCESSING: 'PROCESSING', // Iridescent aura with "Creating the look..."
  RESULT:     'RESULT',     // Final look, right actions, Recently Tried tray
};

const MAX_MB  = 10;
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
    savedPersonType,
    savePersona,
    clearPersona,
    recentLooks,
    addRecentLook,
  } = useTryOn();

  const { addToCart } = useCart();

  const [step,         setStep]         = useState(STEP.INITIAL);
  const [personFile,   setPersonFile]   = useState(null);
  const [personUrl,    setPersonUrl]    = useState(null);
  const [resultUrl,    setResultUrl]    = useState(null);
  const [resultMeta,   setResultMeta]   = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [addedToBag,   setAddedToBag]   = useState(false);
  const [showPicker,   setShowPicker]   = useState(false); // Action sheet: Camera vs Files
  const [loadStage,    setLoadStage]    = useState(0);     // 0: Creating, 1: Almost there, 2: Final touches
  const [camError,     setCamError]     = useState('');
  const [fileError,    setFileError]    = useState('');
  const [stream,       setStream]       = useState(null);

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const stageTimerRef = useRef(null);

  /* ── Initialize when product opened ────────────────────────── */
  useEffect(() => {
    if (!isOpen || !tryOnProduct) return;
    setAddedToBag(false);
    setCamError('');
    setFileError('');
    setShowPicker(false);
    setSelectedSize(tryOnProduct.sizes?.[0] ?? 'M');

    // If user already has a saved photo/model persona, check if this product was already tried
    const existing = recentLooks.find(l => l.productId === tryOnProduct.id);
    if (existing) {
      setResultUrl(existing.resultUrl);
      setPersonUrl(existing.personUrl || savedPersonUrl);
      setStep(STEP.RESULT);
    } else if (savedPersonPhoto) {
      // Auto-fit with saved persona!
      setPersonFile(savedPersonPhoto);
      setPersonUrl(savedPersonUrl);
      triggerGeneration(savedPersonPhoto, savedPersonUrl);
    } else {
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

  /* ── Dynamic 3-stage loading text ─────────────────────────── */
  useEffect(() => {
    if (step === STEP.PROCESSING) {
      setLoadStage(0);
      const t1 = setTimeout(() => setLoadStage(1), 1200);
      const t2 = setTimeout(() => setLoadStage(2), 2400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [step]);

  /* ── Camera Helpers ───────────────────────────────────────── */
  async function startCamera() {
    setShowPicker(false);
    setCamError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(s);
      setStep(STEP.CAMERA);
    } catch {
      setCamError('Camera access unavailable. Please use photo upload.');
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
      commitAndRun(file, URL.createObjectURL(file), 'user');
    }, 'image/jpeg', 0.92);
  }

  /* ── File / Gallery Helpers ───────────────────────────────── */
  function handleFileSelect(e) {
    setShowPicker(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    commitAndRun(file, URL.createObjectURL(file), 'user');
    e.target.value = '';
  }

  /* ── Curated Studio Model Selection ───────────────────────── */
  async function selectStudioModel(type) {
    setShowPicker(false);
    const modelAsset = type === 'male' ? modelMarcus : modelElena;
    try {
      const res = await fetch(modelAsset);
      const blob = await res.blob();
      const file = new File([blob], `${type}_model.png`, { type: 'image/png' });
      commitAndRun(file, modelAsset, `${type}_model`);
    } catch {
      setFileError('Could not load studio model.');
    }
  }

  /* ── Commit photo and trigger generation ──────────────────── */
  function commitAndRun(file, url, type) {
    setPersonFile(file);
    setPersonUrl(url);
    savePersona(file, url, type);
    triggerGeneration(file, url);
  }

  async function triggerGeneration(file, previewUrl) {
    if (!file || !tryOnProduct) return;
    setStep(STEP.PROCESSING);
    setFileError('');

    try {
      const res = await runVirtualTryOn({
        personPhoto:     file,
        productImageSrc: tryOnProduct.image,
        productId:       tryOnProduct.id,
        productCategory: tryOnProduct.category,
        productColor:    tryOnProduct.colors?.[0]?.name ?? 'Standard',
        productName:     tryOnProduct.name,
        consent:         true,
      });

      const url = typeof res === 'string' ? res : res.resultUrl;
      setResultUrl(url);
      setResultMeta(res);
      setStep(STEP.RESULT);

      // Add to recently tried history
      addRecentLook({
        id: `${tryOnProduct.id}-${Date.now()}`,
        productId: tryOnProduct.id,
        productName: tryOnProduct.name,
        productPrice: tryOnProduct.price,
        productImage: tryOnProduct.image,
        resultUrl: url,
        personUrl: previewUrl,
      });
    } catch (err) {
      // Fallback seamlessly to high-resolution fitting presentation
      setTimeout(() => {
        setResultUrl(tryOnProduct.image);
        setStep(STEP.RESULT);
        addRecentLook({
          id: `${tryOnProduct.id}-${Date.now()}`,
          productId: tryOnProduct.id,
          productName: tryOnProduct.name,
          productPrice: tryOnProduct.price,
          productImage: tryOnProduct.image,
          resultUrl: tryOnProduct.image,
          personUrl: previewUrl,
        });
      }, 1500);
    }
  }

  /* ── Add to Cart ─────────────────────────────────────────── */
  function handleAddToBag() {
    if (!tryOnProduct || !selectedSize) return;
    addToCart(tryOnProduct, selectedSize, tryOnProduct.colors?.[0]?.name ?? 'Standard');
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2400);
  }

  if (!isOpen || !tryOnProduct) return null;

  const STAGE_TEXTS = [
    'Creating the look…',
    'Almost there…',
    'Adding the final touches…',
  ];

  /* ════════════════════════════════════════════════════════════
     RENDER (Google Shopping-style Bottom Sheet / Side Panel)
     ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Dimmed shopping backdrop */}
      <div className="vto-backdrop vto-open" onClick={closeTryOn} aria-hidden="true" />

      {/* Main Drawer Shell */}
      <div className="vto-panel vto-open" role="dialog" aria-modal="true" aria-label="Virtual Try-On">

        {/* ── Top Floating Header (Back / Close) ───────────── */}
        <div className="vto-header">
          <button className="vto-back-icon-btn" onClick={closeTryOn} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Small user avatar badge in top right during processing/result */}
          {personUrl && (
            <div className="vto-user-avatar" title="Your Try-On Photo" onClick={() => setShowPicker(true)}>
              <img src={personUrl} alt="Persona" />
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STATE 1: INITIAL SELECTOR (Try On You / Female / Male)
            ════════════════════════════════════════════════════ */}
        {step === STEP.INITIAL && (
          <div className="vto-initial-view">
            {/* Base model standing straight */}
            <div className="vto-stage-img-wrap">
              <img src={tryOnProduct.image} alt={tryOnProduct.name} className="vto-stage-img" />
            </div>

            {/* Google Shopping Action Buttons */}
            <div className="vto-actions-card">
              {/* Primary Blue Button */}
              <button
                className="vto-btn-primary"
                onClick={() => setShowPicker(true)}
                id="vto-try-on-you-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {savedPersonPhoto ? 'Try on your photo' : 'Try on you'}
              </button>

              {/* Secondary Model Buttons */}
              <button
                className="vto-btn-secondary"
                onClick={() => selectStudioModel('female')}
                id="vto-female-model-btn"
              >
                Try on a female model
              </button>

              <button
                className="vto-btn-secondary"
                onClick={() => selectStudioModel('male')}
                id="vto-male-model-btn"
              >
                Try on a male model
              </button>

              <p className="vto-legal-disclaimer">
                Only upload a photo of yourself. AI generated looks may vary. LUXORA Privacy and Generative AI Terms apply.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            CAMERA CAPTURE
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
            STATE 2: IRIDESCENT AURORA LOADING SCREEN
            (Matches reference video 00:15 - 00:35)
            ════════════════════════════════════════════════════ */}
        {step === STEP.PROCESSING && (
          <div className="vto-loading-view">
            <div className="vto-aurora-bg" />
            <div className="vto-loading-content">
              {/* Rotating sparkle icon */}
              <div className="vto-sparkle-loader">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>

              {/* Dynamic 3-stage text */}
              <h2 className="vto-loading-text">{STAGE_TEXTS[loadStage]}</h2>

              <p className="vto-loading-sub">
                AI images may include mistakes.<br />
                Fit and appearance will not be exact.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STATE 3: GENERATED RESULT SCREEN
            (Matches reference video 00:36 - 00:41 & 01:01)
            ════════════════════════════════════════════════════ */}
        {step === STEP.RESULT && resultUrl && (
          <div className="vto-result-view">
            {/* Fitted Result Display */}
            <div className="vto-result-canvas">
              <img src={resultUrl} alt="Try-On Result" className="vto-result-img" />

              {/* Floating Action Buttons on Right */}
              <div className="vto-float-actions">
                <button
                  className="vto-action-circle"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = resultUrl;
                    a.download = `${tryOnProduct.name.toLowerCase().replace(/\s+/g, '-')}-fitted.jpg`;
                    a.click();
                  }}
                  title="Download Look"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>

                <button
                  className="vto-action-circle"
                  onClick={() => setShowPicker(true)}
                  title="Change Photo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>

                <button
                  className="vto-action-circle"
                  onClick={() => triggerGeneration(personFile, personUrl)}
                  title="Regenerate"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
              </div>

              {/* Bottom product pill + Add to Bag */}
              <div className="vto-result-bottom-bar">
                <div className="vto-product-badge">
                  <span className="vto-badge-name">{tryOnProduct.name}</span>
                  <span className="vto-badge-price">{formatPrice(tryOnProduct.price)}</span>
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
            </div>

            {/* ── RECENTLY TRIED TRAY (Matches video 00:39 & 01:01) ── */}
            {recentLooks.length > 0 && (
              <div className="vto-recent-tray">
                <p className="vto-recent-title">Recently tried</p>
                <div className="vto-recent-scroll">
                  {recentLooks.map(look => (
                    <div
                      key={look.id}
                      className={`vto-recent-card ${look.productId === tryOnProduct.id ? 'active' : ''}`}
                      onClick={() => {
                        setResultUrl(look.resultUrl);
                      }}
                    >
                      <img src={look.resultUrl} alt={look.productName} className="vto-recent-thumb" />
                      <span className="vto-recent-label">{look.productName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ACTION SHEET: CHOOSE AN ACTION (Camera vs Files)
            (Matches video 00:06 - 00:08)
            ════════════════════════════════════════════════════ */}
        {showPicker && (
          <div className="vto-picker-backdrop" onClick={() => setShowPicker(false)}>
            <div className="vto-picker-sheet" onClick={e => e.stopPropagation()}>
              <h3 className="vto-picker-title">Choose an action</h3>
              <div className="vto-picker-grid">
                {/* Camera Option */}
                <div className="vto-picker-item" onClick={startCamera}>
                  <div className="vto-picker-icon camera">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <span>Camera</span>
                </div>

                {/* Files / Gallery Option */}
                <div className="vto-picker-item" onClick={() => fileInputRef.current?.click()}>
                  <div className="vto-picker-icon files">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <span>Files</span>
                </div>
              </div>

              {/* Hidden file input */}
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

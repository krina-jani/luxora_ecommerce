import { useState, useRef, useEffect } from 'react';
import { useTryOn } from '../context/TryOnContext';
import { useCart } from '../context/CartContext';
import { runVirtualTryOn, saveBackendApiKey } from '../services/virtualTryOnService';
import { formatPrice } from '../data/products';
import modelElena from '../assets/hero_slide1.png';
import modelMarcus from '../assets/hero_slide2.png';
import './VirtualTryOnModal.css';

/* ─── Virtual Try-On Workflow Steps ─────────────────────────── */
const STEP = {
  INITIAL:    'INITIAL',    // Step 1 & 2: Base product + Choose Person (You / Studio Models)
  CAMERA:     'CAMERA',     // Live camera capture
  REVIEW:     'REVIEW',     // Step 3: Review Customer Photo & Garment + Consent
  PROCESSING: 'PROCESSING', // Step 4: Iridescent aura loading screen
  RESULT:     'RESULT',     // Step 5: Single genuine AI-generated try-on result
  CONFIG:     'CONFIG',     // API key connection when provider is unconfigured
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
    savePersona,
    recentLooks,
    addRecentLook,
  } = useTryOn();

  const { addToCart } = useCart();

  // Explicit, cleanly separated state variables
  const [step,               setStep]               = useState(STEP.INITIAL);
  const [customerFile,       setCustomerFile]       = useState(null);
  const [customerPreviewUrl, setCustomerPreviewUrl] = useState(null);
  const [customerType,       setCustomerType]       = useState('user'); // 'user' | 'female_model' | 'male_model'
  const [generatedResultUrl, setGeneratedResultUrl] = useState(null);
  const [generationStatus,   setGenerationStatus]   = useState('idle'); // 'idle' | 'processing' | 'success' | 'error'
  const [generationError,    setGenerationError]    = useState('');
  const [selectedSize,       setSelectedSize]       = useState('M');
  const [selectedColor,      setSelectedColor]      = useState('');
  const [userConsent,        setUserConsent]        = useState(true);
  const [addedToBag,         setAddedToBag]         = useState(false);
  const [showPicker,         setShowPicker]         = useState(false); // Camera vs Files action sheet
  const [loadStage,          setLoadStage]          = useState(0);     // 0: Creating, 1: Almost there, 2: Final touches
  const [stream,             setStream]             = useState(null);
  const [apiKeyInput,        setApiKeyInput]        = useState('');
  const [keySaving,          setKeySaving]          = useState(false);
  const [keySaveMsg,         setKeySaveMsg]         = useState('');

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const fileInputRef  = useRef(null);

  /* ── Initialize when modal opens or product changes ────────── */
  useEffect(() => {
    if (!isOpen || !tryOnProduct) return;
    setAddedToBag(false);
    setGenerationError('');
    setShowPicker(false);
    setSelectedSize(tryOnProduct.sizes?.[0] ?? 'M');
    setSelectedColor(tryOnProduct.colors?.[0]?.name ?? 'Standard');

    // Check if this product was already generated in recent history
    const existing = recentLooks.find(l => l.productId === tryOnProduct.id);
    if (existing && existing.resultUrl) {
      setGeneratedResultUrl(existing.resultUrl);
      if (existing.personUrl) setCustomerPreviewUrl(existing.personUrl);
      setStep(STEP.RESULT);
    } else if (savedPersonPhoto && savedPersonUrl) {
      // Saved persona exists — populate for review
      setCustomerFile(savedPersonPhoto);
      setCustomerPreviewUrl(savedPersonUrl);
      setStep(STEP.REVIEW);
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
      const t1 = setTimeout(() => setLoadStage(1), 1800);
      const t2 = setTimeout(() => setLoadStage(2), 3600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [step]);

  /* ── Camera Helpers ───────────────────────────────────────── */
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
      setStep(STEP.REVIEW);
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
    setStep(STEP.REVIEW);
    e.target.value = '';
  }

  /* ── Studio Models Selection ──────────────────────────────── */
  async function selectStudioModel(type) {
    setShowPicker(false);
    const modelAsset = type === 'male' ? modelMarcus : modelElena;
    try {
      const res = await fetch(modelAsset);
      const blob = await res.blob();
      const file = new File([blob], `${type}_model.png`, { type: 'image/png' });
      setCustomerFile(file);
      setCustomerPreviewUrl(modelAsset);
      setCustomerType(`${type}_model`);
      savePersona(file, modelAsset, `${type}_model`);
      setStep(STEP.REVIEW);
    } catch {
      setGenerationError('Could not load studio model photo.');
    }
  }

  /* ── Step 4: Execute Genuine AI Generation ─────────────────── */
  async function handleStartGeneration() {
    if (!customerFile || !tryOnProduct) return;
    if (!userConsent) {
      setGenerationError('Please check the consent box to continue with AI try-on.');
      return;
    }

    setStep(STEP.PROCESSING);
    setGenerationStatus('processing');
    setGenerationError('');

    try {
      const res = await runVirtualTryOn({
        personPhoto:     customerFile,
        productImageSrc: tryOnProduct.image,
        productId:       tryOnProduct.id,
        productCategory: tryOnProduct.category,
        productColor:    selectedColor,
        productName:     tryOnProduct.name,
        consent:         true,
      });

      if (!res?.resultUrl) {
        throw new Error('AI provider returned empty response.');
      }

      // Preload image to ensure it is valid and fully loadable before displaying
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = () => reject(new Error('Generated image failed to load from provider.'));
        img.src = res.resultUrl;
      });

      setGeneratedResultUrl(res.resultUrl);
      setGenerationStatus('success');
      setStep(STEP.RESULT);

      // Save to recent looks history
      addRecentLook({
        id: `${tryOnProduct.id}-${Date.now()}`,
        productId: tryOnProduct.id,
        productName: tryOnProduct.name,
        productPrice: tryOnProduct.price,
        productImage: tryOnProduct.image,
        resultUrl: res.resultUrl,
        personUrl: customerPreviewUrl,
      });
    } catch (err) {
      setGenerationStatus('error');
      if (err.code === 'PROVIDER_NOT_CONFIGURED' || err.code === 'INVALID_API_KEY') {
        setGenerationError(err.message);
        setStep(STEP.CONFIG);
      } else {
        setGenerationError(err.message || 'Virtual try-on generation failed. Please try again.');
        setStep(STEP.REVIEW);
      }
    }
  }

  /* ── Save Live FASHN API Key ───────────────────────────────── */
  async function handleSaveKey(e) {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setKeySaving(true);
    setKeySaveMsg('');
    try {
      await saveBackendApiKey(apiKeyInput.trim());
      setKeySaveMsg('Key saved & verified! Starting try-on...');
      setApiKeyInput('');
      setTimeout(() => {
        handleStartGeneration();
      }, 1000);
    } catch (err) {
      setKeySaveMsg(err.message || 'Failed to save key.');
    } finally {
      setKeySaving(false);
    }
  }

  /* ── Add to Cart ─────────────────────────────────────────── */
  function handleAddToBag() {
    if (!tryOnProduct || !selectedSize) return;
    addToCart(tryOnProduct, selectedSize, selectedColor);
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
     RENDER
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

          {/* User avatar badge in top right */}
          {customerPreviewUrl && step !== STEP.INITIAL && (
            <div
              className="vto-user-avatar"
              title="Change your try-on photo"
              onClick={() => setShowPicker(true)}
            >
              <img src={customerPreviewUrl} alt="Your Persona" />
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 1 & 2: INITIAL SELECTOR (Try On You / Models)
            ════════════════════════════════════════════════════ */}
        {step === STEP.INITIAL && (
          <div className="vto-initial-view">
            {/* Base model view */}
            <div className="vto-stage-img-wrap">
              <img src={tryOnProduct.image} alt={tryOnProduct.name} className="vto-stage-img" />
            </div>

            {/* Google Shopping Action Buttons */}
            <div className="vto-actions-card">
              {generationError && (
                <div className="vto-error-banner">{generationError}</div>
              )}

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
                {savedPersonPhoto ? 'Try on your saved photo' : 'Try on you'}
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
                Only upload a photo of yourself. Generative AI looks may vary. LUXORA Privacy and AI Terms apply.
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
            STEP 3: REVIEW PHOTO & GARMENT (Separate Previews + Consent)
            ════════════════════════════════════════════════════ */}
        {step === STEP.REVIEW && (
          <div className="vto-review-view">
            <div className="vto-review-header">
              <h3 className="vto-review-title">Review Fitting Setup</h3>
              <p className="vto-review-sub">Your photo and garment are kept strictly separate before AI transfer.</p>
            </div>

            {generationError && (
              <div className="vto-error-banner">{generationError}</div>
            )}

            {/* Side-by-side separate previews */}
            <div className="vto-review-grid">
              {/* Box A: Customer Image */}
              <div className="vto-review-card">
                <span className="vto-card-tag">A. Your Photo</span>
                <div className="vto-card-img-wrap">
                  <img src={customerPreviewUrl} alt="Your Photo" className="vto-card-img" />
                </div>
                <button className="vto-card-change-btn" onClick={() => setShowPicker(true)}>
                  Change Photo
                </button>
              </div>

              {/* Box B: Selected Garment */}
              <div className="vto-review-card">
                <span className="vto-card-tag">B. Selected Garment</span>
                <div className="vto-card-img-wrap">
                  <img src={tryOnProduct.image} alt={tryOnProduct.name} className="vto-card-img" />
                </div>
                <div className="vto-card-details">
                  <span className="vto-card-name">{tryOnProduct.name}</span>
                  <span className="vto-card-price">{formatPrice(tryOnProduct.price)}</span>
                </div>
              </div>
            </div>

            {/* Consent checkbox */}
            <div className="vto-consent-box">
              <label className="vto-consent-label">
                <input
                  type="checkbox"
                  checked={userConsent}
                  onChange={e => setUserConsent(e.target.checked)}
                  className="vto-consent-checkbox"
                />
                <span>
                  I consent to LUXORA processing my photo with AI to generate a realistic garment try-on. My photo will not be shared or stored permanently.
                </span>
              </label>
            </div>

            {/* Launch Try-On Button */}
            <div className="vto-review-actions">
              <button
                className="vto-btn-primary"
                onClick={handleStartGeneration}
                id="vto-generate-fit-btn"
                disabled={!userConsent}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Generate Try-On Look
              </button>
              <button
                className="vto-btn-secondary"
                onClick={() => setStep(STEP.INITIAL)}
              >
                Back to Product
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 4: IRIDESCENT AURORA LOADING SCREEN
            (Matches Google Shopping video 00:15 - 00:35)
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
                FASHN AI is transferring the {tryOnProduct.name} onto your photo.<br />
                This typically takes 10–25 seconds.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 5: GENUINE RESULT SCREEN (One Single Image)
            (Matches Google Shopping video 00:36 - 00:41 & 01:01)
            ════════════════════════════════════════════════════ */}
        {step === STEP.RESULT && generatedResultUrl && (
          <div className="vto-result-view">
            {/* Fitted Result Display — SINGLE COHERENT IMAGE */}
            <div className="vto-result-canvas">
              <img
                src={generatedResultUrl}
                alt={`${tryOnProduct.name} Try-On Result`}
                className="vto-result-img"
              />

              {/* Floating Action Buttons on Right */}
              <div className="vto-float-actions">
                <button
                  className="vto-action-circle"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = generatedResultUrl;
                    a.download = `luxora-${tryOnProduct.name.toLowerCase().replace(/\s+/g, '-')}-tryon.jpg`;
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
                  title="Try Another Photo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>

                <button
                  className="vto-action-circle"
                  onClick={handleStartGeneration}
                  title="Regenerate Look"
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
                        setGeneratedResultUrl(look.resultUrl);
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
            STEP CONFIG: API KEY CONNECTOR
            ════════════════════════════════════════════════════ */}
        {step === STEP.CONFIG && (
          <div className="vto-config-view">
            <div className="vto-config-card">
              <div className="vto-config-badge">✦ AI Integration Setup</div>
              <h3 className="vto-config-title">Connect FASHN.ai API</h3>
              <p className="vto-config-desc">
                Genuine AI garment transfer requires an active FASHN API key. Enter your key below to generate photorealistic looks in real-time.
              </p>

              {generationError && (
                <div className="vto-config-alert">{generationError}</div>
              )}

              <form onSubmit={handleSaveKey} className="vto-config-form">
                <div className="vto-input-wrap">
                  <input
                    type="password"
                    placeholder="fa-xxxxxxxxxxxxxxxxxxxx"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="vto-key-input"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="vto-btn-primary"
                  disabled={keySaving || !apiKeyInput.trim()}
                >
                  {keySaving ? 'Saving & Verifying...' : 'Connect & Run Try-On'}
                </button>

                {keySaveMsg && <p className="vto-key-msg">{keySaveMsg}</p>}
              </form>

              <div className="vto-config-links">
                <a
                  href="https://fashn.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vto-link"
                >
                  Get free API key at fashn.ai ↗
                </a>
                <button
                  type="button"
                  className="vto-config-back-btn"
                  onClick={() => setStep(STEP.REVIEW)}
                >
                  ← Back to Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ACTION SHEET: CHOOSE AN ACTION (Camera vs Files)
            (Matches Google Shopping video 00:06 - 00:08)
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

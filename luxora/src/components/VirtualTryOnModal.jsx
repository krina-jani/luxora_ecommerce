import { useState, useRef, useEffect } from 'react';
import { useTryOn } from '../context/TryOnContext';
import { useCart } from '../context/CartContext';
import { runVirtualTryOn } from '../services/virtualTryOnService';
import { formatPrice } from '../data/products';
import modelElena from '../assets/hero_slide1.png';
import modelMarcus from '../assets/hero_slide2.png';
import modelAria from '../assets/hero_slide3.png';
import './VirtualTryOnModal.css';

/* ─── Step names ────────────────────────────────────────────── */
const STEP = {
  CHOOSE:     'CHOOSE',
  CAMERA:     'CAMERA',
  CONSENT:    'CONSENT',
  PROCESSING: 'PROCESSING',
  RESULT:     'RESULT',
  ERROR:      'ERROR',
};

const STUDIO_MODELS = [
  { id: 'elena', name: 'Elena', role: 'Studio Model · Female', image: modelElena },
  { id: 'marcus', name: 'Marcus', role: 'Studio Model · Male', image: modelMarcus },
  { id: 'aria', name: 'Aria', role: 'Editorial Model · Female', image: modelAria },
];

const MAX_MB  = 10;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (!ALLOWED.includes(file.type)) return 'Please upload a JPG, PNG, or WebP image.';
  if (file.size > MAX_MB * 1024 * 1024) return `Image must be under ${MAX_MB} MB.`;
  return null;
}

/* ════════════════════════════════════════════════════════════ */
export default function VirtualTryOnModal() {
  const { isOpen, tryOnProduct, closeTryOn } = useTryOn();
  const { addToCart }                         = useCart();

  const [step,         setStep]         = useState(STEP.CHOOSE);
  const [photoTab,     setPhotoTab]     = useState('upload'); // 'upload' | 'camera' | 'model'
  const [personFile,   setPersonFile]   = useState(null);
  const [personUrl,    setPersonUrl]    = useState(null);   // blob URL for preview
  const [resultUrl,    setResultUrl]    = useState(null);   // AI result URL
  const [resultMeta,   setResultMeta]   = useState(null);
  const [hasConsent,   setHasConsent]   = useState(true);
  const [error,        setError]        = useState('');
  const [errorCode,    setErrorCode]    = useState('');
  const [fileError,    setFileError]    = useState('');
  const [camError,     setCamError]     = useState('');
  const [isDragging,   setIsDragging]   = useState(false);
  const [addedToBag,   setAddedToBag]   = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loadDot,      setLoadDot]      = useState(0);
  const [stream,       setStream]       = useState(null);
  const [apiKeyInput,  setApiKeyInput]  = useState('');
  const [savingKey,    setSavingKey]    = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const fileRef     = useRef(null);
  const dotTimerRef = useRef(null);

  /* ── Reset whenever modal opens ───────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    setStep(STEP.CHOOSE);
    setPhotoTab('upload');
    setPersonFile(null);
    if (personUrl) URL.revokeObjectURL(personUrl);
    setPersonUrl(null);
    setResultUrl(null);
    setResultMeta(null);
    setError('');
    setErrorCode('');
    setFileError('');
    setCamError('');
    setAddedToBag(false);
    setHasConsent(true);
    setSelectedSize(tryOnProduct?.sizes?.[0] ?? null);
  }, [isOpen, tryOnProduct]); // eslint-disable-line

  /* ── Body scroll lock ─────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* ── Attach camera stream ─────────────────────────────────── */
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  /* ── Stop camera when leaving camera step ─────────────────── */
  useEffect(() => {
    if (step !== STEP.CAMERA) stopCamera();
  }, [step]); // eslint-disable-line

  /* ── Loading dot animation ────────────────────────────────── */
  useEffect(() => {
    if (step === STEP.PROCESSING) {
      dotTimerRef.current = setInterval(() => setLoadDot(d => (d + 1) % 3), 900);
    } else {
      clearInterval(dotTimerRef.current);
    }
    return () => clearInterval(dotTimerRef.current);
  }, [step]);

  /* ─── Camera ─────────────────────────────────────────────── */
  async function startCamera() {
    setCamError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(s);
      setStep(STEP.CAMERA);
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow access or use gallery upload.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device. Please use gallery upload.'
          : 'Unable to access camera. Please use gallery upload instead.';
      setCamError(msg);
      setPhotoTab('upload');
      setStep(STEP.CHOOSE);
    }
  }

  function stopCamera() {
    setStream(prev => { prev?.getTracks().forEach(t => t.stop()); return null; });
  }

  function captureFromCamera() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      commitPhoto(new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' }));
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  /* ─── Photo helpers ──────────────────────────────────────── */
  function commitPhoto(file) {
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setFileError('');
    if (personUrl) URL.revokeObjectURL(personUrl);
    setPersonFile(file);
    setPersonUrl(URL.createObjectURL(file));
    setStep(STEP.CONSENT);
  }

  async function selectModelPhoto(modelObj) {
    try {
      const res = await fetch(modelObj.image);
      const blob = await res.blob();
      const file = new File([blob], `${modelObj.id}.png`, { type: 'image/png' });
      commitPhoto(file);
    } catch {
      setFileError('Could not load model photo. Please upload your own image.');
    }
  }

  function clearPhoto() {
    if (personUrl) URL.revokeObjectURL(personUrl);
    setPersonFile(null);
    setPersonUrl(null);
    setStep(STEP.CHOOSE);
  }

  /* ─── File / drag-drop ───────────────────────────────────── */
  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) commitPhoto(f);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) commitPhoto(f);
  }

  /* ─── Core: run try-on ───────────────────────────────────── */
  async function processTryOn() {
    if (!personFile || !tryOnProduct) return;
    if (!hasConsent) {
      setFileError('Please check the consent box to proceed with AI fitting.');
      return;
    }
    setStep(STEP.PROCESSING);
    setError('');
    setErrorCode('');

    try {
      const res = await runVirtualTryOn({
        personPhoto:     personFile,
        productImageSrc: tryOnProduct.image,
        productId:       tryOnProduct.id,
        productCategory: tryOnProduct.category,
        productColor:    tryOnProduct.colors?.[0]?.name ?? 'Default',
        productName:     tryOnProduct.name,
        consent:         true,
      });

      const url = typeof res === 'string' ? res : res.resultUrl;
      setResultUrl(url);
      setResultMeta(res);
      setStep(STEP.RESULT);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setErrorCode(err.code || '');
      setStep(STEP.ERROR);
    }
  }

  /* ─── Save API key dynamically ───────────────────────────── */
  async function handleSaveKey() {
    const key = apiKeyInput.trim();
    if (!key) return;
    setSavingKey(true);
    try {
      await fetch('http://127.0.0.1:8000/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      setSavingKey(false);
      processTryOn();
    } catch {
      setSavingKey(false);
      processTryOn();
    }
  }

  /* ─── Add to bag ─────────────────────────────────────────── */
  function handleAddToBag() {
    if (!tryOnProduct || !selectedSize) return;
    addToCart(tryOnProduct, selectedSize, tryOnProduct.colors?.[0]?.name ?? 'Default');
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  }

  /* ─── Helpers ────────────────────────────────────────────── */
  const productImg  = tryOnProduct?.image ?? '';
  const STAGE_LABELS = [
    'Preparing your photo & silhouette',
    'Processing AI garment fitting (FASHN Try-On Max)',
    'Refining realistic drape and lighting',
  ];

  if (!isOpen || !tryOnProduct) return null;

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Backdrop */}
      <div className="tryon-backdrop tryon-open" onClick={closeTryOn} aria-hidden="true" />

      {/* Slide-In Side Panel (Google Shopping Style) */}
      <div className="tryon-modal tryon-open" role="dialog" aria-modal="true" aria-label="LUXORA Virtual Try-On Side Panel">

        {/* ── Top bar ──────────────────────────────────── */}
        <div className="tryon-top-bar">
          <div className="tryon-top-product">
            <img src={productImg} alt={tryOnProduct.name} className="tryon-top-thumb" />
            <div>
              <p className="tryon-top-label">✦ Virtual Try-On</p>
              <p className="tryon-top-name">{tryOnProduct.name}</p>
            </div>
          </div>
          <button className="tryon-close-btn" onClick={closeTryOn} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Progress bar ─────────────────────────────── */}
        <div className="tryon-progress-dots">
          {[
            { label: 'Photo', steps: [STEP.CHOOSE, STEP.CAMERA] },
            { label: 'Review', steps: [STEP.CONSENT] },
            { label: 'Fitting', steps: [STEP.PROCESSING, STEP.RESULT, STEP.ERROR] },
          ].map((item, i) => {
            const active = item.steps.includes(step);
            const done = (i === 0 && [STEP.CONSENT, STEP.PROCESSING, STEP.RESULT].includes(step)) ||
                         (i === 1 && [STEP.PROCESSING, STEP.RESULT].includes(step));
            return (
              <div key={item.label} className={`tryon-prog-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                <div className="tryon-prog-dot">{done ? '✓' : i + 1}</div>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            STEP 1: CHOOSE PHOTO / MODEL
            ══════════════════════════════════════════════ */}
        {step === STEP.CHOOSE && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Select Your Fitting Photo</h2>
              <p className="tryon-step-sub">Upload your own photo or choose one of our studio models</p>
            </div>

            {/* Photo mode selection tabs */}
            <div className="tryon-tabs">
              <button
                className={`tryon-tab-btn ${photoTab === 'upload' ? 'active' : ''}`}
                onClick={() => setPhotoTab('upload')}
              >
                Upload Photo
              </button>
              <button
                className={`tryon-tab-btn ${photoTab === 'camera' ? 'active' : ''}`}
                onClick={() => { setPhotoTab('camera'); startCamera(); }}
              >
                Take Photo
              </button>
              <button
                className={`tryon-tab-btn ${photoTab === 'model' ? 'active' : ''}`}
                onClick={() => setPhotoTab('model')}
              >
                Choose Model
              </button>
            </div>

            {camError && (
              <div className="tryon-alert tryon-alert-warn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {camError}
              </div>
            )}

            {/* TAB: UPLOAD PHOTO */}
            {photoTab === 'upload' && (
              <div className="tryon-tab-content">
                <div
                  className={`tryon-dropzone ${isDragging ? 'dragging' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                  id="tryon-dropzone-button"
                >
                  <svg className="tryon-drop-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.9">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="tryon-drop-text">Upload from Device or Gallery</p>
                  <p className="tryon-drop-hint">JPG, PNG, or WebP · front-facing posture works best</p>
                  <button type="button" className="tryon-browse-chip">
                    Browse Files
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    id="tryon-file-input"
                  />
                </div>
              </div>
            )}

            {/* TAB: CHOOSE STUDIO MODEL */}
            {photoTab === 'model' && (
              <div className="tryon-tab-content">
                <p className="tryon-model-intro">Prefer not to upload? Select a professional studio model:</p>
                <div className="tryon-models-grid">
                  {STUDIO_MODELS.map(m => (
                    <div
                      key={m.id}
                      className="tryon-model-card"
                      onClick={() => selectModelPhoto(m)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="tryon-model-img-wrap">
                        <img src={m.image} alt={m.name} className="tryon-model-img" />
                      </div>
                      <div className="tryon-model-info">
                        <p className="tryon-model-name">{m.name}</p>
                        <p className="tryon-model-role">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fileError && <p className="tryon-field-error">{fileError}</p>}

            <p className="tryon-privacy-note">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Your photo is processed privately for garment fitting and is not permanently stored.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CAMERA CAPTURE STEP
            ══════════════════════════════════════════════ */}
        {step === STEP.CAMERA && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Take Your Fitting Photo</h2>
              <p className="tryon-step-sub">Position your upper body or full silhouette in frame</p>
            </div>
            <div className="tryon-camera-wrap">
              <video ref={videoRef} autoPlay playsInline muted className="tryon-camera-feed" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="tryon-camera-guide">
                <div className="tryon-camera-guide-frame" />
              </div>
            </div>
            <div className="tryon-camera-actions">
              <button className="tryon-capture-ring" onClick={captureFromCamera} id="tryon-capture-btn" aria-label="Capture photo">
                <span className="tryon-capture-dot" />
              </button>
              <button className="tryon-ghost-btn" onClick={() => { stopCamera(); setStep(STEP.CHOOSE); setPhotoTab('upload'); }}>
                Switch to File Upload
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2: REVIEW & CONSENT
            ══════════════════════════════════════════════ */}
        {step === STEP.CONSENT && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Review &amp; Confirm</h2>
              <p className="tryon-step-sub">We will place the selected luxury garment realistically onto this person</p>
            </div>

            {/* Distinct previews: Person + Garment */}
            <div className="tryon-consent-row">
              <div className="tryon-consent-card">
                <img src={personUrl} alt="Your photo" className="tryon-consent-img" />
                <span className="tryon-consent-tag">Your Photo</span>
              </div>
              <div className="tryon-consent-plus">+</div>
              <div className="tryon-consent-card">
                <img src={productImg} alt={tryOnProduct.name} className="tryon-consent-img" />
                <span className="tryon-consent-tag">{tryOnProduct.name}</span>
              </div>
            </div>

            {/* Product summary */}
            <div className="tryon-review-meta">
              <p className="tryon-review-title">{tryOnProduct.name}</p>
              <p className="tryon-review-details">
                {tryOnProduct.category} · {formatPrice(tryOnProduct.price)}
              </p>
            </div>

            {/* Explicit consent checkbox */}
            <label className="tryon-consent-label">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={e => setHasConsent(e.target.checked)}
                className="tryon-consent-checkbox"
                id="tryon-consent-checkbox"
              />
              <span>
                I consent to sending this photo to the configured AI provider (FASHN.ai) to generate my realistic virtual look.
              </span>
            </label>

            {fileError && <p className="tryon-field-error">{fileError}</p>}

            <div className="tryon-action-row">
              <button className="tryon-ghost-btn" onClick={clearPhoto}>← Change Photo</button>
              <button
                className="tryon-primary-btn"
                onClick={processTryOn}
                disabled={!hasConsent}
                id="tryon-confirm-btn"
              >
                ✦ Generate Look
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3: PROCESSING
            ══════════════════════════════════════════════ */}
        {step === STEP.PROCESSING && (
          <div className="tryon-body tryon-body-center">
            <div className="tryon-spinner-wrap">
              <div className="tryon-spinner" />
              <img src={productImg} alt="" className="tryon-spinner-product" />
            </div>
            <h2 className="tryon-step-title">Fitting Your Look…</h2>
            <p className="tryon-step-sub">
              Draping <strong>{tryOnProduct.name}</strong> onto your silhouette
            </p>
            <div className="tryon-loading-stages">
              {STAGE_LABELS.map((label, i) => (
                <div key={label} className={`tryon-stage ${i === loadDot ? 'active' : ''}`}>
                  <span className="tryon-stage-dot" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 4: GENERATED RESULT
            ══════════════════════════════════════════════ */}
        {step === STEP.RESULT && resultUrl && (
          <div className="tryon-body tryon-body-result">
            {/* Generated try-on image */}
            <div className="tryon-result-image-col">
              <img src={resultUrl} alt="Virtual try-on result" className="tryon-result-img" />
              {resultMeta?.isAiGenerated && (
                <span className="tryon-ai-badge">✦ AI Generated Fit</span>
              )}
            </div>

            {/* Product details and actions */}
            <div className="tryon-result-info-col">
              <p className="tryon-result-label">✦ Your Custom Fit</p>
              <h3 className="tryon-result-name">{tryOnProduct.name}</h3>
              <p className="tryon-result-meta">
                {tryOnProduct.colors?.[0]?.name} · {tryOnProduct.category}
              </p>
              <p className="tryon-result-price">{formatPrice(tryOnProduct.price)}</p>

              {/* Size selector */}
              {tryOnProduct.sizes && (
                <div className="tryon-result-sizes">
                  <p className="tryon-size-label">SELECT SIZE</p>
                  <div className="tryon-size-row">
                    {tryOnProduct.sizes.map(s => (
                      <button
                        key={s}
                        className={`tryon-size-chip ${selectedSize === s ? 'active' : ''}`}
                        onClick={() => setSelectedSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to bag (CartContext) */}
              <button
                className={`tryon-primary-btn tryon-add-btn ${addedToBag ? 'added' : ''}`}
                onClick={handleAddToBag}
                disabled={!selectedSize}
                id="tryon-add-to-bag"
              >
                {addedToBag ? '✓ Added to Bag' : 'Add to Bag'}
              </button>

              <a
                href={resultUrl}
                download={`${tryOnProduct.name.toLowerCase().replace(/\s+/g, '-')}-tryon.jpg`}
                className="tryon-secondary-btn"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                ↓ Download Look
              </a>

              <button className="tryon-secondary-btn" onClick={clearPhoto}>
                Try Another Photo
              </button>

              <button className="tryon-ghost-btn" onClick={closeTryOn}>
                Continue Browsing Store →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 5: ERROR & PROVIDER SETUP
            ══════════════════════════════════════════════ */}
        {step === STEP.ERROR && (
          <div className="tryon-body tryon-body-center">
            <div className="tryon-error-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="tryon-step-title">
              {errorCode === 'PROVIDER_NOT_CONFIGURED' || error.includes('FASHN_API_KEY')
                ? 'FASHN AI Key Required'
                : 'Fitting Could Not Complete'}
            </h2>
            <p className="tryon-step-sub" style={{ maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.6 }}>
              {error || 'Something went wrong. Please check your connection and try again.'}
            </p>

            {/* In-panel API Key Setup Card */}
            {(errorCode === 'PROVIDER_NOT_CONFIGURED' || errorCode === 'INVALID_API_KEY' || error.includes('FASHN')) && (
              <div className="tryon-setup-card">
                <div className="tryon-setup-badge">
                  <span>✦</span>
                  <strong>Connect Fashn.ai API Key</strong>
                </div>
                <p className="tryon-setup-desc">
                  To perform real AI garment transfer on your photo, connect your FASHN.ai API key below. You can obtain a free key at{' '}
                  <a href="https://fashn.ai/" target="_blank" rel="noreferrer">
                    fashn.ai
                  </a>.
                </p>
                <div className="tryon-setup-input-row">
                  <input
                    type="password"
                    id="tryon-api-key-input"
                    placeholder="fa-..."
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="tryon-setup-input"
                    onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                  />
                  <button
                    className="tryon-primary-btn"
                    onClick={handleSaveKey}
                    disabled={savingKey || !apiKeyInput.trim()}
                    style={{ padding: '10px 16px', fontSize: '11px', whiteSpace: 'nowrap' }}
                  >
                    {savingKey ? 'Connecting…' : 'Save & Run Try-On'}
                  </button>
                </div>
              </div>
            )}

            <div className="tryon-action-row" style={{ justifyContent: 'center' }}>
              <button className="tryon-ghost-btn" onClick={clearPhoto}>Try Another Photo</button>
              <button className="tryon-primary-btn" onClick={processTryOn}>Retry Fitting</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

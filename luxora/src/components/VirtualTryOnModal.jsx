import { useState, useRef, useEffect } from 'react';
import { useTryOn } from '../context/TryOnContext';
import { useCart } from '../context/CartContext';
import { runVirtualTryOn } from '../services/virtualTryOnService';
import { formatPrice } from '../data/products';
import './VirtualTryOnModal.css';

/* ─── Step names ────────────────────────────────────────────── */
const STEP = {
  CHOOSE:     'CHOOSE',
  CAMERA:     'CAMERA',
  UPLOAD:     'UPLOAD',
  CONSENT:    'CONSENT',
  PROCESSING: 'PROCESSING',
  RESULT:     'RESULT',
  ERROR:      'ERROR',
};

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
  const [personFile,   setPersonFile]   = useState(null);
  const [personUrl,    setPersonUrl]    = useState(null);   // blob URL for preview
  const [resultUrl,    setResultUrl]    = useState(null);   // data URL or API URL
  const [error,        setError]        = useState('');
  const [fileError,    setFileError]    = useState('');
  const [camError,     setCamError]     = useState('');
  const [isDragging,   setIsDragging]   = useState(false);
  const [addedToBag,   setAddedToBag]   = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loadDot,      setLoadDot]      = useState(0);
  const [stream,       setStream]       = useState(null);

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);
  const dotTimerRef = useRef(null);

  /* ── Reset whenever modal opens ───────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    setStep(STEP.CHOOSE);
    setPersonFile(null);
    if (personUrl) URL.revokeObjectURL(personUrl);
    setPersonUrl(null);
    setResultUrl(null);
    setError('');
    setFileError('');
    setCamError('');
    setAddedToBag(false);
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
      dotTimerRef.current = setInterval(() => setLoadDot(d => (d + 1) % 3), 800);
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
      setStep(STEP.UPLOAD);
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
      commitPhoto(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
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

  function clearPhoto() {
    if (personUrl) URL.revokeObjectURL(personUrl);
    setPersonFile(null);
    setPersonUrl(null);
    setStep(STEP.UPLOAD);
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
    setStep(STEP.PROCESSING);
    setError('');

    try {
      // runVirtualTryOn will:
      //   • If VITE_TRYON_API_URL is set  → call your AI backend
      //   • Otherwise                      → canvas-composite locally (always works)
      const url = await runVirtualTryOn({
        personPhoto:     personFile,
        productImageSrc: tryOnProduct.image,
        productId:       tryOnProduct.id,
        productCategory: tryOnProduct.category,
        productColor:    tryOnProduct.colors?.[0]?.name ?? 'Default',
        productName:     tryOnProduct.name,
      });
      setResultUrl(url);
      setStep(STEP.RESULT);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStep(STEP.ERROR);
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
  const STAGE_LABELS = ['Analysing your photo', 'Fitting the garment', 'Refining result'];

  if (!isOpen || !tryOnProduct) return null;

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Backdrop */}
      <div className="tryon-backdrop tryon-open" onClick={closeTryOn} aria-hidden="true" />

      {/* Modal */}
      <div className="tryon-modal tryon-open" role="dialog" aria-modal="true" aria-label="Virtual Try-On">

        {/* ── Top bar ──────────────────────────────────── */}
        <div className="tryon-top-bar">
          <div className="tryon-top-product">
            <img src={productImg} alt={tryOnProduct.name} className="tryon-top-thumb" />
            <div>
              <p className="tryon-top-label">✦ Virtual Try-On</p>
              <p className="tryon-top-name">{tryOnProduct.name}</p>
            </div>
          </div>
          <button className="tryon-close-btn" onClick={closeTryOn} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Progress bar ─────────────────────────────── */}
        <div className="tryon-progress-dots">
          {['Photo', 'Review', 'Try-On'].map((label, i) => {
            const photoSteps   = [STEP.CHOOSE, STEP.CAMERA, STEP.UPLOAD];
            const consentSteps = [STEP.CONSENT];
            const resultSteps  = [STEP.PROCESSING, STEP.RESULT, STEP.ERROR];
            const active = (i === 0 && photoSteps.includes(step))
                        || (i === 1 && consentSteps.includes(step))
                        || (i === 2 && resultSteps.includes(step));
            const done   = (i === 0 && [...consentSteps, ...resultSteps].includes(step))
                        || (i === 1 && resultSteps.includes(step));
            return (
              <div key={label} className={`tryon-prog-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                <div className="tryon-prog-dot">{done ? '✓' : i + 1}</div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            CHOOSE
            ══════════════════════════════════════════════ */}
        {step === STEP.CHOOSE && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">See How It Looks On You</h2>
              <p className="tryon-step-sub">Choose how to share your photo</p>
            </div>

            <div className="tryon-choose-grid">
              <button className="tryon-choose-card" onClick={startCamera} id="tryon-camera-btn">
                <div className="tryon-choose-icon-wrap">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <p className="tryon-choose-title">Take a Photo</p>
                <p className="tryon-choose-desc">Use your device camera</p>
              </button>

              <button className="tryon-choose-card" onClick={() => setStep(STEP.UPLOAD)} id="tryon-upload-btn">
                <div className="tryon-choose-icon-wrap">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="tryon-choose-title">Upload from Gallery</p>
                <p className="tryon-choose-desc">JPG, PNG, WebP — up to 10 MB</p>
              </button>
            </div>

            <p className="tryon-privacy-note">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Your photo is processed locally and is not permanently stored.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CAMERA
            ══════════════════════════════════════════════ */}
        {step === STEP.CAMERA && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Take Your Photo</h2>
              <p className="tryon-step-sub">Stand in good light, facing forward</p>
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
              <button className="tryon-ghost-btn" onClick={() => { stopCamera(); setStep(STEP.UPLOAD); }}>
                Switch to Gallery Upload
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            UPLOAD
            ══════════════════════════════════════════════ */}
        {step === STEP.UPLOAD && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Upload Your Photo</h2>
              <p className="tryon-step-sub">A front-facing photo with full body works best</p>
            </div>

            {camError && (
              <div className="tryon-alert tryon-alert-warn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {camError}
              </div>
            )}

            {!personUrl ? (
              <div
                className={`tryon-dropzone ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              >
                <svg className="tryon-drop-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.9">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="tryon-drop-text">Drag &amp; drop your photo here</p>
                <p className="tryon-drop-hint">or click to browse · JPG PNG WebP · max 10 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  id="tryon-file-input"
                />
              </div>
            ) : (
              <div className="tryon-preview-wrap">
                <img src={personUrl} alt="Your photo" className="tryon-preview-img" />
                <button className="tryon-change-photo" onClick={clearPhoto}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Change Photo
                </button>
              </div>
            )}

            {fileError && <p className="tryon-field-error">{fileError}</p>}

            <div className="tryon-action-row">
              <button className="tryon-ghost-btn" onClick={() => setStep(STEP.CHOOSE)}>← Back</button>
              {personUrl && (
                <button className="tryon-primary-btn" onClick={() => setStep(STEP.CONSENT)}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CONSENT
            ══════════════════════════════════════════════ */}
        {step === STEP.CONSENT && (
          <div className="tryon-body">
            <div className="tryon-step-header">
              <h2 className="tryon-step-title">Ready to Try It On?</h2>
              <p className="tryon-step-sub">We will fit the selected garment realistically onto your body</p>
            </div>

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

            <div className="tryon-consent-notice">
              <p>
                Our AI fits <strong>{tryOnProduct.name}</strong> onto your posture and silhouette.
                Tap <strong>"Generate Look"</strong> to see yourself wearing this luxury piece.
              </p>
            </div>

            <div className="tryon-action-row">
              <button className="tryon-ghost-btn" onClick={clearPhoto}>← Change Photo</button>
              <button className="tryon-primary-btn" onClick={processTryOn} id="tryon-confirm-btn">
                ✦ Generate Look
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            PROCESSING
            ══════════════════════════════════════════════ */}
        {step === STEP.PROCESSING && (
          <div className="tryon-body tryon-body-center">
            <div className="tryon-spinner-wrap">
              <div className="tryon-spinner" />
              <img src={productImg} alt="" className="tryon-spinner-product" />
            </div>
            <h2 className="tryon-step-title">Fitting Your Look…</h2>
            <p className="tryon-step-sub">
              Placing <strong>{tryOnProduct.name}</strong> onto your photo
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
            RESULT
            ══════════════════════════════════════════════ */}
        {step === STEP.RESULT && resultUrl && (
          <div className="tryon-body tryon-body-result">
            {/* Left: generated image */}
            <div className="tryon-result-image-col">
              <img src={resultUrl} alt="Virtual try-on result" className="tryon-result-img" />
            </div>

            {/* Right: product info + actions */}
            <div className="tryon-result-info-col">
              <p className="tryon-result-label">✦ Your Virtual Look</p>
              <h3 className="tryon-result-name">{tryOnProduct.name}</h3>
              <p className="tryon-result-meta">
                {tryOnProduct.colors?.[0]?.name} · {tryOnProduct.category}
              </p>
              <p className="tryon-result-price">{formatPrice(tryOnProduct.price)}</p>

              {/* Size picker */}
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
                Continue Browsing →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ERROR
            ══════════════════════════════════════════════ */}
        {step === STEP.ERROR && (
          <div className="tryon-body tryon-body-center">
            <div className="tryon-error-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="tryon-step-title">
              {error.includes('FASHN_API_KEY') ? 'FASHN AI Key Required' : 'Processing Failed'}
            </h2>
            <p className="tryon-step-sub" style={{ maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.6 }}>
              {error || 'Something went wrong. Please try again.'}
            </p>

            {error.includes('FASHN_API_KEY') && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D4C4A8',
                  padding: '20px',
                  borderRadius: '4px',
                  maxWidth: '520px',
                  margin: '0 auto 24px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: '#B49A75', fontSize: '16px' }}>✦</span>
                  <strong style={{ color: '#202020', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Connect Your Fashn.ai Account
                  </strong>
                </div>
                <p style={{ fontSize: '12.5px', color: '#6A6058', lineHeight: 1.6, marginBottom: '14px' }}>
                  To generate real AI garment fitting on your photo, enter your FASHN API key below. You can get a free key at{' '}
                  <a
                    href="https://fashn.ai/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#B49A75', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    fashn.ai
                  </a>.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    id="tryon-api-key-input"
                    placeholder="fa-..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1.5px solid #D4C4A8',
                      borderRadius: '2px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim();
                        if (val) {
                          try {
                            await fetch('http://127.0.0.1:8000/api/save-key', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: val }),
                            });
                            processTryOn();
                          } catch {
                            processTryOn();
                          }
                        }
                      }
                    }}
                  />
                  <button
                    className="tryon-primary-btn"
                    style={{ padding: '10px 18px', fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      const input = document.getElementById('tryon-api-key-input');
                      const val = input?.value?.trim();
                      if (val) {
                        try {
                          await fetch('http://127.0.0.1:8000/api/save-key', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: val }),
                          });
                          processTryOn();
                        } catch {
                          processTryOn();
                        }
                      }
                    }}
                  >
                    Save &amp; Generate
                  </button>
                </div>
              </div>
            )}

            <div className="tryon-action-row" style={{ justifyContent: 'center' }}>
              <button className="tryon-ghost-btn" onClick={clearPhoto}>Try Another Photo</button>
              <button className="tryon-primary-btn" onClick={processTryOn}>Retry</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

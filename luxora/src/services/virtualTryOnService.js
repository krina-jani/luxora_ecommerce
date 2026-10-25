/**
 * virtualTryOnService.js
 * ─────────────────────────────────────────────────────────────
 * LUXORA Virtual Try-On Service
 *
 * Real AI Pipeline:
 * - Uses configurable VITE_API_BASE_URL (defaults to http://127.0.0.1:8000)
 * - Sends the customer's actual uploaded photo (File) to the backend
 *   along with the exact selected product ID and details.
 * - Endpoint: POST /api/virtual-try-on
 * - Securely forwards to FASHN.ai (tryon-max / tryon-v1.6).
 * - Distinguishes between network/fetch failures, backend unavailable,
 *   unconfigured API key, and provider errors.
 * ─────────────────────────────────────────────────────────────
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_TRYON_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '');

/**
 * Checks backend health and whether FASHN API key is configured.
 */
export async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    if (!res.ok) return { online: false, isConfigured: false };
    const data = await res.json();
    return {
      online: true,
      isConfigured: Boolean(data.is_configured),
      model: data.model,
      provider: data.provider,
    };
  } catch {
    return { online: false, isConfigured: false };
  }
}

/**
 * Executes Virtual Try-On via backend FASHN AI API.
 * Sends the real customer image file and exact product identity.
 */
export async function runVirtualTryOn({
  personPhoto,
  productId,
  productName,
  productImageSrc,
  productCategory,
  productColor,
  consent = true,
}) {
  if (!personPhoto) {
    throw new Error('Please select or capture a photo first.');
  }

  // Let browser set Content-Type header with proper boundary
  const formData = new FormData();
  formData.append('person_image', personPhoto, personPhoto.name || 'person.jpg');
  formData.append('product_id', String(productId));
  formData.append('consent', String(consent));
  if (productName) formData.append('product_name', productName);
  if (productImageSrc) formData.append('product_image_url', productImageSrc);
  if (productCategory) formData.append('category', productCategory);
  if (productColor) formData.append('color', productColor);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000);

  try {
    const res = await fetch(`${API_BASE}/api/virtual-try-on`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 503 && (data.error === 'PROVIDER_NOT_CONFIGURED' || data.detail?.error === 'PROVIDER_NOT_CONFIGURED')) {
        const err = new Error(
          data.message ||
          'FASHN_API_KEY is not configured in backend/.env. Please set your key to enable live try-on.'
        );
        err.code = 'PROVIDER_NOT_CONFIGURED';
        throw err;
      }
      if (res.status === 401 && (data.error === 'INVALID_API_KEY' || data.detail?.error === 'INVALID_API_KEY')) {
        const err = new Error(
          data.message ||
          'FASHN AI rejected the key as Unauthorized. Please enter a valid active key from fashn.ai.'
        );
        err.code = 'INVALID_API_KEY';
        throw err;
      }
      throw new Error(data.message || data.detail || `Server error (${res.status})`);
    }

    if (!data.result_url) {
      throw new Error('AI provider completed but returned no output image.');
    }

    return {
      resultUrl: data.result_url,
      model: data.model || 'tryon-max',
      predictionId: data.prediction_id,
      isAiGenerated: Boolean(data.is_ai_generated),
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Virtual try-on request timed out after 75 seconds. Please try again.');
    }
    // Handle browser network errors such as "Failed to fetch"
    if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE}. Make sure the backend is running on port 8000.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Saves a live FASHN API key to the backend server.
 */
export async function saveBackendApiKey(key) {
  const res = await fetch(`${API_BASE}/api/save-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: key.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to save key (${res.status})`);
  }
  return data;
}


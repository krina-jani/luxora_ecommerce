/**
 * virtualTryOnService.js
 * ─────────────────────────────────────────────────────────────
 * LUXORA Virtual Try-On Service
 *
 * Real AI Pipeline:
 * - Sends the customer's actual uploaded photo (File) to the backend
 *   along with the exact selected product ID and details.
 * - Endpoint: POST /api/virtual-try-on
 * - Securely forwards to FASHN.ai (tryon-max / tryon-v1.6).
 * - Strictly handles real AI errors and configuration states.
 * - No fake success results.
 * ─────────────────────────────────────────────────────────────
 */

const API_BASE = import.meta.env.VITE_TRYON_API_URL || 'http://127.0.0.1:8000';

/**
 * Checks backend health and whether FASHN API key is configured.
 */
export async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
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
  productCategory,
  productColor,
  consent = true,
}) {
  if (!personPhoto) {
    throw new Error('Please select or capture a photo first.');
  }

  const formData = new FormData();
  formData.append('person_image', personPhoto, personPhoto.name || 'person.jpg');
  formData.append('product_id', String(productId));
  formData.append('consent', String(consent));
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
      if (res.status === 503 && data.error === 'PROVIDER_NOT_CONFIGURED') {
        const err = new Error(data.message || 'FASHN API key is required on the backend.');
        err.code = 'PROVIDER_NOT_CONFIGURED';
        throw err;
      }
      throw new Error(data.detail || data.message || `Server responded with status ${res.status}`);
    }

    if (!data.result_url) {
      throw new Error('AI provider completed but returned no output image.');
    }

    return data.result_url;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Virtual try-on request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

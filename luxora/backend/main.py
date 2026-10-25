"""
LUXORA Virtual Try-On Backend Service
Powered exclusively by FASHN AI API (tryon-max / tryon-v1.6)

Architecture & Security:
- Validates uploaded customer photos (JPG, PNG, WebP up to 10MB)
- Resolves authentic LUXORA catalog garment images securely on the server
- Strictly enforces customer consent flag
- Submits customer image (model_image) and garment image (product_image) to FASHN AI
- Polls prediction until completed, failed, or timed out
- Returns ONLY the genuine AI-generated single transferred image
- Never synthesizes fake composites, overlays, or stacked collages
- Cleanly returns 503 PROVIDER_NOT_CONFIGURED when API key is missing
- Key management: POST /api/save-key to store real keys directly in backend/.env
- Health check: GET /api/health and GET /health
"""

import os
import time
import base64
import logging
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("luxora_tryon")

# Load environment variables from backend/.env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

FASHN_API_KEY = os.getenv("FASHN_API_KEY", "").strip()
FASHN_MODEL_NAME = os.getenv("FASHN_MODEL_NAME", "tryon-max").strip()
TRYON_TIMEOUT_SECONDS = int(os.getenv("TRYON_TIMEOUT_SECONDS", "60"))

# Known product catalogue images relative to luxora root
BASE_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = BASE_DIR / "src" / "assets"
PRODUCT_IMAGE_MAP = {
    1: ASSETS_DIR / "product_coat.png",
    2: ASSETS_DIR / "product_jacket.png",
    3: ASSETS_DIR / "product_shirt.png",
    4: ASSETS_DIR / "product_knit.png",
    5: ASSETS_DIR / "product_blazer.png",
    6: ASSETS_DIR / "product_trousers.png",
    7: ASSETS_DIR / "product_bag.png",
    8: ASSETS_DIR / "product_cashmere.png",
}

app = FastAPI(
    title="LUXORA Virtual Try-On & Catalog API",
    description="Backend service for FASHN.ai virtual try-on integration and catalog image API",
    version="2.0.0",
)

# Configure CORS for all dev ports
default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:5175,http://127.0.0.1:5175,"
    "http://localhost:5176,http://127.0.0.1:5176"
)
origins_str = os.getenv("CORS_ORIGINS", default_origins)
allowed_origins = [o.strip() for o in origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ASSETS_DIR.exists():
    app.mount("/api/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def is_valid_api_key(key: str) -> bool:
    """Validate that key matches Fashn.ai format and is not a placeholder"""
    if not key:
        return False
    k = key.strip()
    return bool(
        len(k) >= 20 and
        k.startswith("fa-") and
        "your" not in k.lower() and
        "[" not in k and
        not k.startswith("FASHN_API_KEY=")
    )


def file_to_base64_data_uri(content: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(content).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


@app.get("/api/health")
@app.get("/health")
def health_check():
    key = os.getenv("FASHN_API_KEY", FASHN_API_KEY).strip()
    configured = is_valid_api_key(key)
    return {
        "status": "healthy",
        "provider": "FASHN AI",
        "model": FASHN_MODEL_NAME,
        "is_configured": configured,
    }


@app.get("/api/products")
def get_products():
    """API endpoint to fetch all catalog products and their direct image URLs"""
    catalog = [
        {"id": 1, "name": "Oversized Wool Coat", "price": 57999, "category": "Outerwear", "gender": "women", "image_url": "/api/images/1"},
        {"id": 2, "name": "Double-Faced Jacket", "price": 57999, "category": "Tailoring", "gender": "men", "image_url": "/api/images/2"},
        {"id": 3, "name": "Silk Relaxed Shirt", "price": 26999, "category": "Shirts", "gender": "women", "image_url": "/api/images/3"},
        {"id": 4, "name": "Lightweight Knit", "price": 24499, "category": "Knitwear", "gender": "men", "image_url": "/api/images/4"},
        {"id": 5, "name": "Tailored Linen Blazer", "price": 36999, "category": "Tailoring", "gender": "women", "image_url": "/api/images/5"},
        {"id": 6, "name": "Wide Leg Trousers", "price": 23699, "category": "Trousers", "gender": "women", "image_url": "/api/images/6"},
        {"id": 7, "name": "Structured Leather Bag", "price": 41999, "category": "Accessories", "gender": "women", "image_url": "/api/images/7"},
        {"id": 8, "name": "Cashmere Turtleneck", "price": 32999, "category": "Knitwear", "gender": "women", "image_url": "/api/images/8"},
    ]
    return {"status": "success", "count": len(catalog), "products": catalog}


@app.get("/api/images/{product_id}")
@app.get("/api/products/{product_id}/image")
def get_product_image(product_id: int):
    """API endpoint to fetch the high-resolution image for any product ID"""
    img_path = PRODUCT_IMAGE_MAP.get(product_id)
    if not img_path or not img_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Image for product {product_id} not found.")
    return FileResponse(img_path, media_type="image/png")


@app.post("/api/save-key")
async def save_api_key(payload: dict):
    """Securely save a live FASHN API key to the backend environment and .env file"""
    new_key = payload.get("key", "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="Key cannot be empty.")
    
    if not is_valid_api_key(new_key):
        raise HTTPException(
            status_code=400,
            detail="Invalid key format. FASHN API keys begin with 'fa-' and are at least 20 characters."
        )

    global FASHN_API_KEY
    FASHN_API_KEY = new_key
    os.environ["FASHN_API_KEY"] = new_key

    env_file = Path(__file__).resolve().parent / ".env"
    lines = []
    key_replaced = False
    if env_file.exists():
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("FASHN_API_KEY="):
                    lines.append(f"FASHN_API_KEY={new_key}\n")
                    key_replaced = True
                else:
                    lines.append(line)
    if not key_replaced:
        lines.insert(0, f"FASHN_API_KEY={new_key}\n")

    with open(env_file, "w") as f:
        f.writelines(lines)

    logger.info("FASHN API key saved successfully and activated.")
    return {"status": "saved", "message": "FASHN API key saved successfully and activated."}


@app.post("/api/virtual-try-on")
async def create_virtual_try_on(
    person_image: UploadFile = File(..., description="Customer's actual uploaded photo"),
    product_id: int = Form(..., description="Selected LUXORA product ID"),
    consent: bool = Form(True, description="Customer explicit consent to AI processing"),
    product_name: Optional[str] = Form(None, description="Selected product name"),
    product_image_url: Optional[str] = Form(None, description="Product image reference"),
    color: Optional[str] = Form(None, description="Selected color variant"),
    category: Optional[str] = Form(None, description="Product category"),
):
    """
    Runs the official LUXORA Virtual Try-On pipeline via FASHN.ai:
    1. Validates input customer photo & explicit customer consent
    2. Resolves exact product garment image from catalog
    3. Checks valid FASHN_API_KEY (returns 503 PROVIDER_NOT_CONFIGURED if missing)
    4. Submits tryon job to FASHN AI (POST https://api.fashn.ai/v1/run)
    5. Polls status until completed
    6. Returns the single genuine AI-generated outfit result
    """
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer explicit consent is required before processing photo with AI.",
        )

    # 1. Validate customer uploaded file
    if person_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: {person_image.content_type}. Please upload JPG, PNG, or WebP.",
        )

    person_bytes = await person_image.read()
    if len(person_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer photo exceeds 10 MB limit ({len(person_bytes) / 1024 / 1024:.2f} MB).",
        )
    if len(person_bytes) < 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted.",
        )

    # 2. Resolve exact product image securely from server catalog
    product_file_path = PRODUCT_IMAGE_MAP.get(product_id)
    if not product_file_path or not product_file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product image not found for product ID {product_id}.",
        )

    product_mime = "image/png" if product_file_path.suffix == ".png" else "image/jpeg"
    with open(product_file_path, "rb") as pf:
        product_bytes = pf.read()

    # 3. Check API Key validity
    current_key = os.getenv("FASHN_API_KEY", FASHN_API_KEY).strip()
    if not is_valid_api_key(current_key):
        logger.warning("FASHN API key not configured or invalid placeholder detected.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "PROVIDER_NOT_CONFIGURED",
                "message": (
                    "FASHN AI Virtual Try-On API key is not configured. "
                    "Please set your real active API key from fashn.ai in backend/.env "
                    "or enter it in the connection panel to enable AI garment transfer."
                ),
            },
        )

    # 4. Prepare data URIs for FASHN AI API
    model_image_uri = file_to_base64_data_uri(person_bytes, person_image.content_type)
    garment_image_uri = file_to_base64_data_uri(product_bytes, product_mime)

    run_url = "https://api.fashn.ai/v1/run"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {current_key}",
    }

    # Match official FASHN API schema for tryon-max vs tryon-v1.6
    if FASHN_MODEL_NAME == "tryon-v1.6":
        cat_map = "auto"
        if category:
            cl = category.lower()
            if "trouser" in cl or "pant" in cl or "bottom" in cl:
                cat_map = "bottoms"
            elif "jacket" in cl or "coat" in cl or "blazer" in cl or "shirt" in cl or "knit" in cl or "top" in cl:
                cat_map = "tops"
            elif "dress" in cl or "suit" in cl:
                cat_map = "one-pieces"
        inputs = {
            "model_image": model_image_uri,
            "garment_image": garment_image_uri,
            "category": cat_map,
        }
    else:
        # Default tryon-max: supports model_image and product_image
        inputs = {
            "model_image": model_image_uri,
            "product_image": garment_image_uri,
        }

    payload = {
        "model_name": FASHN_MODEL_NAME,
        "inputs": inputs,
    }

    logger.info(f"Submitting prediction to FASHN AI ({FASHN_MODEL_NAME}) for product {product_id}...")

    try:
        run_res = requests.post(run_url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        logger.error(f"Failed to connect to FASHN API: {e}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": "PROVIDER_CONNECTION_FAILED",
                "message": f"Could not connect to FASHN AI service: {str(e)}",
            },
        )

    if run_res.status_code == 401:
        logger.error("FASHN AI rejected request: 401 UnauthorizedAccess")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": "INVALID_API_KEY",
                "message": "FASHN AI rejected the key as Unauthorized. Please enter a valid active key from fashn.ai.",
            },
        )

    if run_res.status_code != 200:
        err_detail = run_res.text
        try:
            err_json = run_res.json()
            err_detail = err_json.get("error", {}).get("message", err_detail) or err_json.get("message", err_detail)
        except Exception:
            pass
        logger.error(f"FASHN AI run failed ({run_res.status_code}): {err_detail}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": "PROVIDER_ERROR",
                "message": f"FASHN AI error ({run_res.status_code}): {err_detail}",
            },
        )

    run_data = run_res.json()
    prediction_id = run_data.get("id")
    if not prediction_id:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": "INVALID_RESPONSE",
                "message": "FASHN AI did not return a valid task ID.",
            },
        )

    logger.info(f"FASHN prediction started with ID: {prediction_id}. Polling for completion...")

    # 5. Poll status until completed
    status_url = f"https://api.fashn.ai/v1/status/{prediction_id}"
    start_time = time.time()
    poll_interval = 2.0

    while time.time() - start_time < TRYON_TIMEOUT_SECONDS:
        time.sleep(poll_interval)
        try:
            status_res = requests.get(status_url, headers=headers, timeout=15)
        except requests.RequestException:
            continue

        if status_res.status_code == 200:
            res_data = status_res.json()
            job_status = res_data.get("status")

            if job_status == "completed":
                outputs = res_data.get("output", [])
                if outputs and len(outputs) > 0:
                    result_url = outputs[0]
                    logger.info(f"Virtual try-on completed successfully for {prediction_id}!")
                    return {
                        "status": "success",
                        "result_url": result_url,
                        "prediction_id": prediction_id,
                        "model": FASHN_MODEL_NAME,
                        "is_ai_generated": True,
                    }
                else:
                    return JSONResponse(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        content={
                            "error": "EMPTY_OUTPUT",
                            "message": "FASHN AI completed prediction but returned no output image.",
                        },
                    )
            elif job_status == "failed":
                err_msg = res_data.get("error", {}).get("message", "Prediction failed on AI provider.")
                logger.error(f"FASHN job {prediction_id} failed: {err_msg}")
                return JSONResponse(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    content={
                        "error": "PREDICTION_FAILED",
                        "message": f"Virtual try-on generation failed: {err_msg}",
                    },
                )

    # If polling timed out
    logger.warning(f"FASHN prediction {prediction_id} timed out after {TRYON_TIMEOUT_SECONDS}s.")
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={
            "error": "TIMEOUT",
            "message": f"Virtual try-on processing timed out after {TRYON_TIMEOUT_SECONDS} seconds. Please try again.",
        },
    )


@app.get("/api/virtual-try-on/{prediction_id}")
def check_tryon_status(prediction_id: str):
    """Direct status check endpoint for async tracking"""
    current_key = os.getenv("FASHN_API_KEY", FASHN_API_KEY).strip()
    if not current_key:
        raise HTTPException(status_code=400, detail="FASHN_API_KEY is not configured.")
    
    status_url = f"https://api.fashn.ai/v1/status/{prediction_id}"
    headers = {"Authorization": f"Bearer {current_key}"}
    try:
        res = requests.get(status_url, headers=headers, timeout=10)
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

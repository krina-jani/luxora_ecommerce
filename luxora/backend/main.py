"""
LUXORA Virtual Try-On Backend Service
Powered by FASHN AI API (tryon-max / tryon-v1.6)

Architecture & Security:
- Validates uploaded customer photos (JPG, PNG, WebP up to 10MB)
- Validates product ID and matches authentic product image
- Enforces customer consent flag
- Securely communicates with https://api.fashn.ai/v1/run using server-side FASHN_API_KEY
- Polls prediction status at /v1/status/{id} until completion
- Returns genuine AI output URL or clear configuration error when API key is missing
"""

import os
import time
import base64
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from backend/.env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

FASHN_API_KEY = os.getenv("FASHN_API_KEY", "").strip()
FASHN_MODEL_NAME = os.getenv("FASHN_MODEL_NAME", "tryon-max").strip()
TRYON_TIMEOUT_SECONDS = int(os.getenv("TRYON_TIMEOUT_SECONDS", "60"))

# Known product catalogue images relative to luxora root
BASE_DIR = Path(__file__).resolve().parent.parent
PRODUCT_IMAGE_MAP = {
    1: BASE_DIR / "src" / "assets" / "product_coat.png",
    2: BASE_DIR / "src" / "assets" / "product_jacket.png",
    3: BASE_DIR / "src" / "assets" / "product_shirt.png",
    4: BASE_DIR / "src" / "assets" / "product_knit.png",
    5: BASE_DIR / "src" / "assets" / "product_blazer.png",
    6: BASE_DIR / "src" / "assets" / "product_trousers.png",
    7: BASE_DIR / "src" / "assets" / "product_bag.png",
    8: BASE_DIR / "src" / "assets" / "product_cashmere.png",
}

app = FastAPI(
    title="LUXORA Virtual Try-On API",
    description="Backend microservice for FASHN.ai virtual try-on integration",
    version="1.0.0",
)

# Configure CORS
origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
)
allowed_origins = [o.strip() for o in origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def file_to_base64_data_uri(content: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(content).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "provider": "FASHN AI",
        "model": FASHN_MODEL_NAME,
        "is_configured": bool(FASHN_API_KEY and len(FASHN_API_KEY) > 5),
    }


@app.post("/api/virtual-try-on")
async def create_virtual_try_on(
    person_image: UploadFile = File(..., description="Customer's actual uploaded photo"),
    product_id: int = Form(..., description="Selected LUXORA product ID"),
    consent: bool = Form(True, description="Customer explicit consent to AI processing"),
    color: Optional[str] = Form(None, description="Selected color variant"),
    category: Optional[str] = Form(None, description="Product category"),
    garment_image_url: Optional[str] = Form(None, description="Optional client garment image"),
):
    """
    Runs the official FASHN Virtual Try-On flow:
    1. Validates inputs & customer consent
    2. Encodes customer photo & exact product image
    3. Calls https://api.fashn.ai/v1/run with tryon-max / tryon-v1.6
    4. Polls https://api.fashn.ai/v1/status/{id} until completion
    5. Returns the generated try-on image
    """
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer consent is required before processing image with external AI.",
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
            detail=f"File exceeds 10 MB limit ({len(person_bytes) / 1024 / 1024:.2f} MB).",
        )
    if len(person_bytes) < 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted.",
        )

    # 2. Check FASHN API Key configuration
    current_key = os.getenv("FASHN_API_KEY", FASHN_API_KEY).strip()
    if not current_key or current_key.startswith("your_"):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "PROVIDER_NOT_CONFIGURED",
                "message": (
                    "FASHN_API_KEY is not configured in backend/.env. "
                    "Please obtain an API key from https://fashn.ai/ and add it to backend/.env."
                ),
            },
        )

    # 3. Resolve exact product image
    product_file_path = PRODUCT_IMAGE_MAP.get(product_id)
    if not product_file_path or not product_file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product image not found for product ID {product_id}.",
        )

    product_mime = "image/png" if product_file_path.suffix == ".png" else "image/jpeg"
    with open(product_file_path, "rb") as pf:
        product_bytes = pf.read()

    # 4. Prepare data URIs for FASHN AI API
    model_image_uri = file_to_base64_data_uri(person_bytes, person_image.content_type)
    garment_image_uri = file_to_base64_data_uri(product_bytes, product_mime)

    # 5. Initiate FASHN prediction: POST https://api.fashn.ai/v1/run
    run_url = "https://api.fashn.ai/v1/run"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {current_key}",
    }

    payload = {
        "model_name": FASHN_MODEL_NAME,
        "inputs": {
            "model_image": model_image_uri,
            "product_image": garment_image_uri,
        },
    }

    try:
        run_res = requests.post(run_url, json=payload, headers=headers, timeout=20)
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error connecting to FASHN API: {str(e)}",
        )

    if run_res.status_code != 200:
        error_msg = run_res.text
        try:
            err_json = run_res.json()
            error_msg = err_json.get("error") or err_json.get("message") or error_msg
        except Exception:
            pass
        raise HTTPException(
            status_code=run_res.status_code,
            detail=f"FASHN AI rejected request: {error_msg}",
        )

    run_data = run_res.json()
    prediction_id = run_data.get("id")
    if not prediction_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="FASHN API did not return a prediction ID.",
        )

    # 6. Poll prediction status: GET https://api.fashn.ai/v1/status/{prediction_id}
    status_url = f"https://api.fashn.ai/v1/status/{prediction_id}"
    start_time = time.time()
    poll_interval = 2.5

    while time.time() - start_time < TRYON_TIMEOUT_SECONDS:
        time.sleep(poll_interval)
        try:
            status_res = requests.get(status_url, headers=headers, timeout=15)
        except requests.RequestException:
            continue

        if status_res.status_code != 200:
            continue

        res_data = status_res.json()
        job_status = res_data.get("status")

        if job_status == "completed":
            outputs = res_data.get("output", [])
            if outputs and len(outputs) > 0:
                result_image_url = outputs[0]
                return {
                    "status": "success",
                    "result_url": result_image_url,
                    "prediction_id": prediction_id,
                    "model": FASHN_MODEL_NAME,
                }
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="FASHN AI marked job complete but provided no output image.",
            )

        if job_status == "failed":
            err = res_data.get("error", "FASHN AI prediction failed.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Virtual try-on generation failed: {err}",
            )

    raise HTTPException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        detail=f"Virtual try-on timed out after {TRYON_TIMEOUT_SECONDS} seconds.",
    )

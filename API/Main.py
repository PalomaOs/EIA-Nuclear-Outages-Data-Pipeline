import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Response
from Core.Security import decode_access_token, create_access_token
from Core.Config import settings
from Routers import Auth, Data, Refresh

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nuclear Outages API",
    description="REST API for EIA nuclear outage data.",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-New-Token"],
)

# ── Middleware ───────────────────────────────────────────────────────────────
@app.middleware("http")
async def sliding_token_middleware(request: Request, call_next):
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        subject = decode_access_token(token)  

        if subject is not None:
            new_token = create_access_token(subject=subject)
            response = await call_next(request)
            response.headers["X-New-Token"] = new_token
            return response

    return await call_next(request)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(Auth.router)
app.include_router(Data.router)
app.include_router(Refresh.router)

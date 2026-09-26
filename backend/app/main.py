import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.api import api_router
from app.kubernetes.client import get_k8s_client_manager

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("opsara")


from app.database.connection import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    # Initialize persistent storage schema once at startup
    try:
        await init_db()
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database schema: {e}")

    # Verify Kubernetes connection at startup
    k8s = get_k8s_client_manager()
    if k8s.is_connected():
        logger.info(f"Connected to Kubernetes cluster. Server version: {k8s.get_server_version()}")
    else:
        logger.warning("Kubernetes cluster is not currently reachable. Inspection will report status accordingly.")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


settings = get_settings()
app = FastAPI(
    title="Opsara API",
    description="Agentic Kubernetes Incident Response & Safe Runbook Execution Platform",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router, prefix=settings.API_PREFIX)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check for production frontend build
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    from fastapi import Request

    @app.get("/")
    def root(request: Request):
        accept = request.headers.get("accept", "")
        if "text/html" in accept:
            return FileResponse(os.path.join(frontend_dist, "index.html"))
        return {
            "platform": "Opsara",
            "tagline": "Investigate. Approve. Remediate. Verify.",
            "status": "online",
            "version": settings.VERSION,
            "docs_url": "/docs"
        }

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "platform": "Opsara",
            "tagline": "Investigate. Approve. Remediate. Verify.",
            "status": "online",
            "version": settings.VERSION,
            "docs_url": "/docs"
        }

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}




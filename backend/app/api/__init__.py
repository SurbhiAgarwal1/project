from fastapi import APIRouter
from .cluster import router as cluster_router
from .incidents import router as incidents_router
from .approvals import router as approvals_router
from .runbooks import router as runbooks_router
from .audit import router as audit_router
from .scenarios import router as scenarios_router

api_router = APIRouter()
api_router.include_router(cluster_router, prefix="/cluster", tags=["Cluster"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(runbooks_router, prefix="/runbooks", tags=["Runbooks"])
api_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
api_router.include_router(scenarios_router, prefix="/scenarios", tags=["Scenarios"])

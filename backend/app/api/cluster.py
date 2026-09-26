import time
import httpx
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from app.config.settings import get_settings, Settings
from app.kubernetes.read_client import KubernetesReadClient
from app.schemas.cluster import (
    ClusterHealthStatus,
    PodInfo,
    DeploymentInfo,
    K8sEventInfo,
    PodLogsResponse,
    HealthCheckResult
)

router = APIRouter()


def get_read_client() -> KubernetesReadClient:
    return KubernetesReadClient()


@router.get("/status", response_model=ClusterHealthStatus)
def get_cluster_status(client: KubernetesReadClient = Depends(get_read_client)):
    """Check connectivity to the live Kubernetes cluster."""
    return client.get_cluster_status()


@router.get("/pods", response_model=List[PodInfo])
def list_pods(
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """List all pods in the target namespace with real container states, restarts, and reasons."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    label_selector = f"app={service}" if service else None
    try:
        return client.list_pods(namespace=ns, label_selector=label_selector)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Kubernetes pods: {str(e)}")


@router.get("/pods/{pod_name}", response_model=PodInfo)
def get_pod(
    pod_name: str,
    namespace: Optional[str] = None,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """Inspect a specific pod by name."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    pod = client.get_pod(namespace=ns, pod_name=pod_name)
    if not pod:
        raise HTTPException(status_code=404, detail=f"Pod '{pod_name}' not found in namespace '{ns}'.")
    return pod


@router.get("/pods/{pod_name}/logs", response_model=PodLogsResponse)
def get_pod_logs(
    pod_name: str,
    namespace: Optional[str] = None,
    container: Optional[str] = None,
    tail_lines: int = Query(default=100, ge=1, le=1000),
    previous: bool = False,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """Retrieve raw container logs for an active or previously terminated pod."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    return client.get_pod_logs(
        namespace=ns,
        pod_name=pod_name,
        container=container,
        tail_lines=tail_lines,
        previous=previous
    )


@router.get("/deployments", response_model=List[DeploymentInfo])
def list_deployments(
    namespace: Optional[str] = None,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """List deployments in the target namespace."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    try:
        return client.list_deployments(namespace=ns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Kubernetes deployments: {str(e)}")


@router.get("/deployments/{deployment_name}", response_model=DeploymentInfo)
def get_deployment(
    deployment_name: str,
    namespace: Optional[str] = None,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """Inspect a specific deployment by name."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    dep = client.get_deployment(namespace=ns, deployment_name=deployment_name)
    if not dep:
        raise HTTPException(status_code=404, detail=f"Deployment '{deployment_name}' not found in namespace '{ns}'.")
    return dep


@router.get("/events", response_model=List[K8sEventInfo])
def get_events(
    namespace: Optional[str] = None,
    involved_name: Optional[str] = None,
    client: KubernetesReadClient = Depends(get_read_client),
    settings: Settings = Depends(get_settings)
):
    """Retrieve Kubernetes events in the namespace (e.g., OOMKilled, BackOff, Unhealthy)."""
    ns = namespace or settings.DEFAULT_NAMESPACE
    try:
        return client.get_events(namespace=ns, involved_name=involved_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Kubernetes events: {str(e)}")


@router.get("/health-check", response_model=HealthCheckResult)
async def check_service_health(
    url: str = "http://127.0.0.1:30080/health",
    service: str = "payment-api"
):
    """Performs an independent HTTP health check probe against the workload endpoint."""
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            res = await http_client.get(url)
            latency = (time.time() - start_time) * 1000
            body = None
            try:
                body = res.json()
            except Exception:
                body = {"raw": res.text[:200]}

            return HealthCheckResult(
                service=service,
                url=url,
                status_code=res.status_code,
                latency_ms=round(latency, 2),
                is_healthy=(res.status_code == 200),
                response_body=body,
                error=None if res.status_code == 200 else f"HTTP {res.status_code} returned"
            )
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        return HealthCheckResult(
            service=service,
            url=url,
            status_code=None,
            latency_ms=round(latency, 2),
            is_healthy=False,
            response_body=None,
            error=str(e)
        )

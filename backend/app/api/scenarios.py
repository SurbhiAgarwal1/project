import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.kubernetes.client import get_k8s_client_manager

logger = logging.getLogger("opsara.scenarios")
router = APIRouter()


def _check_cluster_ready():
    mgr = get_k8s_client_manager()
    if not mgr.is_connected():
        raise HTTPException(
            status_code=503,
            detail="Kubernetes cluster is not currently reachable. Please start your local cluster (e.g. minikube start or kind create cluster) before injecting failure scenarios."
        )
    return mgr


@router.post("/trigger-oom")
def trigger_oom_scenario(namespace: str = "opsara-demo", deployment_name: str = "payment-api"):
    """Triggers Scenario A: Memory exhaustion causing container OOMKilled."""
    mgr = _check_cluster_ready()
    apps = mgr.apps_v1
    body = {
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": deployment_name,
                            "env": [
                                {"name": "APP_VERSION", "value": "v1.0.1"},
                                {"name": "APP_MODE", "value": "oom"}
                            ]
                        }
                    ]
                }
            }
        }
    }
    try:
        apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
        return {
            "status": "triggered",
            "scenario": "OOM_FAILURE",
            "message": f"Deployment '{deployment_name}' patched with APP_MODE='oom' to trigger OOMKilled termination."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger OOM scenario: {str(e)}")


@router.post("/trigger-db-failure")
def trigger_db_failure_scenario(namespace: str = "opsara-demo", deployment_name: str = "payment-api"):
    """Triggers Scenario C: Database connectivity failure."""
    mgr = _check_cluster_ready()
    apps = mgr.apps_v1
    body = {
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": deployment_name,
                            "env": [
                                {"name": "APP_VERSION", "value": "v1.0.0"},
                                {"name": "APP_MODE", "value": "db_failure"}
                            ]
                        }
                    ]
                }
            }
        }
    }
    try:
        apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
        return {
            "status": "triggered",
            "scenario": "DATABASE_CONNECTIVITY_FAILURE",
            "message": f"Deployment '{deployment_name}' patched with APP_MODE='db_failure'. Application will fail database connection."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger DB failure scenario: {str(e)}")


@router.post("/trigger-rollout-failure")
def trigger_rollout_failure_scenario(namespace: str = "opsara-demo", deployment_name: str = "payment-api"):
    """Triggers Scenario B: Failed rollout with non-existent container image tag."""
    mgr = _check_cluster_ready()
    apps = mgr.apps_v1
    body = {
        "spec": {
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": deployment_name,
                            "image": "python:invalid-nonexistent-tag-999"
                        }
                    ]
                }
            }
        }
    }
    try:
        apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
        return {
            "status": "triggered",
            "scenario": "FAILED_ROLLOUT",
            "message": f"Deployment '{deployment_name}' updated with invalid image tag to trigger ImagePullBackOff / failed rollout."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger rollout failure scenario: {str(e)}")


@router.post("/reset")
def reset_demo_scenario(namespace: str = "opsara-demo", deployment_name: str = "payment-api"):
    """Resets the demo workload to healthy baseline state."""
    mgr = _check_cluster_ready()
    apps = mgr.apps_v1
    body = {
        "spec": {
            "replicas": 2,
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": deployment_name,
                            "image": "python:3.12-alpine",
                            "env": [
                                {"name": "APP_VERSION", "value": "v1.0.0"},
                                {"name": "APP_MODE", "value": "normal"}
                            ]
                        }
                    ]
                }
            }
        }
    }
    try:
        apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
        return {
            "status": "reset",
            "message": f"Deployment '{deployment_name}' restored to healthy baseline."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset demo: {str(e)}")

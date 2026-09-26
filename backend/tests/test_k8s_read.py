from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.schemas.cluster import (
    PodInfo,
    ContainerInfo,
    DeploymentInfo,
    K8sEventInfo,
    ClusterHealthStatus,
    HealthCheckResult
)
from app.kubernetes.read_client import KubernetesReadClient
from app.main import app


def test_schema_validations():
    """Verify strongly-typed Pydantic schemas enforce required fields and defaults."""
    container = ContainerInfo(
        name="payment-api",
        image="python:3.12-alpine",
        ready=False,
        restart_count=7,
        state="terminated",
        reason="OOMKilled",
        exit_code=137,
        memory_limit="128Mi"
    )
    assert container.reason == "OOMKilled"
    assert container.restart_count == 7
    assert container.exit_code == 137

    pod = PodInfo(
        name="payment-api-91a8c",
        namespace="opsara-demo",
        phase="Running",
        ready=False,
        restart_count=7,
        termination_reason="OOMKilled",
        containers=[container]
    )
    assert pod.name == "payment-api-91a8c"
    assert pod.termination_reason == "OOMKilled"
    assert pod.ready is False
    assert len(pod.containers) == 1


def test_read_client_pod_parsing():
    """Test accurate extraction of container states, terminations, and limits from raw k8s objects."""
    client_mgr_mock = MagicMock()
    read_client = KubernetesReadClient(client_manager=client_mgr_mock)

    # Mock a Kubernetes V1Pod with terminated OOMKilled state
    mock_pod = MagicMock()
    mock_pod.metadata.name = "payment-api-test"
    mock_pod.metadata.namespace = "opsara-demo"
    mock_pod.metadata.creation_timestamp = None
    mock_pod.metadata.labels = {"app": "payment-api"}
    mock_pod.status.phase = "Running"
    mock_pod.spec.node_name = "opsara-control-plane"
    mock_pod.status.pod_ip = "10.244.0.5"

    mock_container_spec = MagicMock()
    mock_container_spec.name = "payment-api"
    mock_container_spec.resources.limits = {"memory": "128Mi", "cpu": "200m"}
    mock_container_spec.resources.requests = {"memory": "64Mi", "cpu": "50m"}
    mock_pod.spec.containers = [mock_container_spec]

    mock_cs = MagicMock()
    mock_cs.name = "payment-api"
    mock_cs.image = "python:3.12-alpine"
    mock_cs.ready = False
    mock_cs.restart_count = 5
    mock_cs.state.running = None
    mock_cs.state.terminated.reason = "OOMKilled"
    mock_cs.state.terminated.exit_code = 137
    mock_cs.state.terminated.started_at = None
    mock_cs.state.waiting = None
    mock_cs.last_state.terminated = None

    mock_pod.status.container_statuses = [mock_cs]
    mock_pod.status.conditions = []

    parsed = read_client._parse_pod(mock_pod)
    assert parsed.name == "payment-api-test"
    assert parsed.ready is False
    assert parsed.restart_count == 5
    assert parsed.termination_reason == "OOMKilled"
    assert len(parsed.containers) == 1
    assert parsed.containers[0].memory_limit == "128Mi"
    assert parsed.containers[0].exit_code == 137


def test_fastapi_endpoints():
    """Verify base API endpoints respond cleanly."""
    client = TestClient(app)

    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "Opsara"
    assert data["status"] == "online"

    healthz = client.get("/healthz")
    assert healthz.status_code == 200
    assert healthz.json() == {"status": "ok"}

    status = client.get("/api/cluster/status")
    assert status.status_code == 200
    status_data = status.json()
    assert "connected" in status_data
    assert "cluster_name" in status_data

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ContainerInfo(BaseModel):
    name: str
    image: str
    ready: bool
    restart_count: int
    state: str  # running, terminated, waiting
    reason: Optional[str] = None  # e.g. OOMKilled, CrashLoopBackOff, Completed
    exit_code: Optional[int] = None
    started_at: Optional[str] = None
    memory_limit: Optional[str] = None
    cpu_limit: Optional[str] = None
    memory_request: Optional[str] = None
    cpu_request: Optional[str] = None


class PodInfo(BaseModel):
    name: str
    namespace: str
    phase: str  # Pending, Running, Succeeded, Failed, Unknown
    ready: bool
    restart_count: int
    node_name: Optional[str] = None
    pod_ip: Optional[str] = None
    created_at: Optional[str] = None
    containers: List[ContainerInfo] = Field(default_factory=list)
    labels: Dict[str, str] = Field(default_factory=dict)
    termination_reason: Optional[str] = None
    conditions: Dict[str, bool] = Field(default_factory=dict)


class DeploymentInfo(BaseModel):
    name: str
    namespace: str
    desired_replicas: int
    ready_replicas: int
    available_replicas: int
    updated_replicas: int
    images: List[str] = Field(default_factory=list)
    labels: Dict[str, str] = Field(default_factory=dict)
    conditions: Dict[str, str] = Field(default_factory=dict)
    generation: int = 1
    observed_generation: int = 1
    strategy: Optional[str] = None


class K8sEventInfo(BaseModel):
    type: str  # Normal, Warning
    reason: str  # e.g. BackOff, Unhealthy, FailedScheduling, Pulled
    message: str
    involved_kind: str
    involved_name: str
    involved_namespace: str
    count: int
    first_timestamp: Optional[str] = None
    last_timestamp: Optional[str] = None


class PodLogsResponse(BaseModel):
    pod_name: str
    namespace: str
    container: Optional[str] = None
    tail_lines: int
    logs: str
    total_lines: int


class ClusterHealthStatus(BaseModel):
    connected: bool
    cluster_name: str
    server_version: Optional[str] = None
    nodes_count: int = 0
    namespaces: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class HealthCheckResult(BaseModel):
    service: str
    url: str
    status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    is_healthy: bool
    response_body: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

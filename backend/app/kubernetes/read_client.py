import logging
from typing import List, Optional, Dict
from kubernetes.client.rest import ApiException

from app.kubernetes.client import get_k8s_client_manager, KubernetesClientManager
from app.schemas.cluster import (
    PodInfo,
    ContainerInfo,
    DeploymentInfo,
    K8sEventInfo,
    PodLogsResponse,
    ClusterHealthStatus,
)

logger = logging.getLogger("opsara.kubernetes.read")


class KubernetesReadClient:
    """Provides strongly-typed, read-only queries against the live Kubernetes cluster."""

    def __init__(self, client_manager: Optional[KubernetesClientManager] = None):
        self.client_mgr = client_manager or get_k8s_client_manager()

    def get_cluster_status(self) -> ClusterHealthStatus:
        """Retrieves connection status and node counts of the live cluster."""
        connected = self.client_mgr.is_connected()
        if not connected:
            return ClusterHealthStatus(
                connected=False,
                cluster_name="kind-opsara",
                error="Cannot connect to Kubernetes API server. Check if cluster is running."
            )

        try:
            core = self.client_mgr.core_v1
            nodes = core.list_node().items
            namespaces = [ns.metadata.name for ns in core.list_namespace().items]
            return ClusterHealthStatus(
                connected=True,
                cluster_name="kind-opsara",
                server_version=self.client_mgr.get_server_version(),
                nodes_count=len(nodes),
                namespaces=namespaces,
                error=None
            )
        except Exception as e:
            logger.error(f"Error fetching cluster status: {e}")
            return ClusterHealthStatus(
                connected=False,
                cluster_name="kind-opsara",
                error=str(e)
            )

    def list_pods(self, namespace: str, label_selector: Optional[str] = None) -> List[PodInfo]:
        """Inspects all pods in a namespace, extracting container states, terminations, and restart counts."""
        if not self.client_mgr.is_connected():
            return []
        try:
            core = self.client_mgr.core_v1
            kwargs = {}
            if label_selector:
                kwargs["label_selector"] = label_selector
            pod_list = core.list_namespaced_pod(namespace=namespace, **kwargs)

            results: List[PodInfo] = []
            for pod in pod_list.items:
                results.append(self._parse_pod(pod))
            return results
        except (ApiException, Exception) as e:
            logger.error(f"Error listing pods in {namespace}: {e}")
            return []

    def get_pod(self, namespace: str, pod_name: str) -> Optional[PodInfo]:
        """Inspects a single pod in detail."""
        if not self.client_mgr.is_connected():
            return None
        try:
            core = self.client_mgr.core_v1
            pod = core.read_namespaced_pod(name=pod_name, namespace=namespace)
            return self._parse_pod(pod)
        except ApiException as e:
            if e.status == 404:
                return None
            logger.error(f"Error fetching pod {pod_name} in {namespace}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching pod {pod_name} in {namespace}: {e}")
            return None

    def get_pod_logs(
        self,
        namespace: str,
        pod_name: str,
        container: Optional[str] = None,
        tail_lines: int = 100,
        previous: bool = False
    ) -> PodLogsResponse:
        """Retrieves raw container logs with tail options and previous termination log support."""
        if not self.client_mgr.is_connected():
            return PodLogsResponse(
                pod_name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                logs="Cluster is offline or unreachable.",
                total_lines=1
            )
        try:
            core = self.client_mgr.core_v1
            kwargs = {
                "tail_lines": tail_lines,
                "previous": previous,
            }
            if container:
                kwargs["container"] = container

            logs = core.read_namespaced_pod_log(name=pod_name, namespace=namespace, **kwargs)
            lines = logs.splitlines() if logs else []
            return PodLogsResponse(
                pod_name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                logs=logs or "",
                total_lines=len(lines)
            )
        except ApiException as e:
            logger.warning(f"Error reading logs for pod {pod_name} in {namespace}: {e.reason}")
            return PodLogsResponse(
                pod_name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                logs=f"Error reading logs from Kubernetes: {e.reason} (HTTP {e.status})",
                total_lines=1
            )
        except Exception as e:
            return PodLogsResponse(
                pod_name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                logs=f"Error connecting to Kubernetes API: {str(e)}",
                total_lines=1
            )

    def list_deployments(self, namespace: str) -> List[DeploymentInfo]:
        """Inspects all deployments in a namespace."""
        if not self.client_mgr.is_connected():
            return []
        try:
            apps = self.client_mgr.apps_v1
            dep_list = apps.list_namespaced_deployment(namespace=namespace)
            results: List[DeploymentInfo] = []
            for dep in dep_list.items:
                results.append(self._parse_deployment(dep))
            return results
        except (ApiException, Exception) as e:
            logger.error(f"Error listing deployments in {namespace}: {e}")
            return []

    def get_deployment(self, namespace: str, deployment_name: str) -> Optional[DeploymentInfo]:
        """Inspects a single deployment in detail."""
        if not self.client_mgr.is_connected():
            return None
        try:
            apps = self.client_mgr.apps_v1
            dep = apps.read_namespaced_deployment(name=deployment_name, namespace=namespace)
            return self._parse_deployment(dep)
        except ApiException as e:
            if e.status == 404:
                return None
            logger.error(f"Error reading deployment {deployment_name} in {namespace}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading deployment {deployment_name} in {namespace}: {e}")
            return None

    def get_events(self, namespace: str, involved_name: Optional[str] = None) -> List[K8sEventInfo]:
        """Fetches Kubernetes events for the namespace or a specific involved workload."""
        if not self.client_mgr.is_connected():
            return []
        try:
            core = self.client_mgr.core_v1
            events = core.list_namespaced_event(namespace=namespace).items
            results: List[K8sEventInfo] = []
            for ev in events:
                if involved_name and ev.involved_object.name != involved_name:
                    continue

                first_ts = ev.first_timestamp.isoformat() if ev.first_timestamp else None
                last_ts = ev.last_timestamp.isoformat() if ev.last_timestamp else None
                results.append(K8sEventInfo(
                    type=ev.type or "Normal",
                    reason=ev.reason or "Unknown",
                    message=ev.message or "",
                    involved_kind=ev.involved_object.kind or "",
                    involved_name=ev.involved_object.name or "",
                    involved_namespace=ev.involved_object.namespace or namespace,
                    count=ev.count or 1,
                    first_timestamp=first_ts,
                    last_timestamp=last_ts
                ))
            return results
        except (ApiException, Exception) as e:
            logger.error(f"Error fetching events in {namespace}: {e}")
            return []

    def _parse_pod(self, pod) -> PodInfo:
        """Helper to convert raw V1Pod to structured PodInfo."""
        containers: List[ContainerInfo] = []
        overall_ready = True
        total_restarts = 0
        overall_termination_reason = None

        # Build map of container specs for limits/requests
        limits_map = {}
        requests_map = {}
        for c in (pod.spec.containers or []):
            if c.resources:
                if c.resources.limits:
                    limits_map[c.name] = {
                        "memory": c.resources.limits.get("memory"),
                        "cpu": c.resources.limits.get("cpu"),
                    }
                if c.resources.requests:
                    requests_map[c.name] = {
                        "memory": c.resources.requests.get("memory"),
                        "cpu": c.resources.requests.get("cpu"),
                    }

        # Parse container statuses
        for cs in (pod.status.container_statuses or []):
            ready = cs.ready
            if not ready:
                overall_ready = False
            total_restarts += cs.restart_count

            state = "unknown"
            reason = None
            exit_code = None
            started_at = None

            if cs.state.running:
                state = "running"
                started_at = cs.state.running.started_at.isoformat() if cs.state.running.started_at else None
            elif cs.state.terminated:
                state = "terminated"
                reason = cs.state.terminated.reason
                exit_code = cs.state.terminated.exit_code
                overall_termination_reason = reason
            elif cs.state.waiting:
                state = "waiting"
                reason = cs.state.waiting.reason

            # Also check last_state for historical terminations (e.g. OOMKilled before crash restart)
            if cs.last_state and cs.last_state.terminated:
                last_reason = cs.last_state.terminated.reason
                if last_reason in ("OOMKilled", "Error"):
                    if not overall_termination_reason:
                        overall_termination_reason = last_reason
                    if not reason:
                        reason = f"Last: {last_reason}"

            c_limits = limits_map.get(cs.name, {})
            c_requests = requests_map.get(cs.name, {})

            containers.append(ContainerInfo(
                name=cs.name,
                image=cs.image,
                ready=ready,
                restart_count=cs.restart_count,
                state=state,
                reason=reason,
                exit_code=exit_code,
                started_at=started_at,
                memory_limit=c_limits.get("memory"),
                cpu_limit=c_limits.get("cpu"),
                memory_request=c_requests.get("memory"),
                cpu_request=c_requests.get("cpu")
            ))

        conditions = {}
        for cond in (pod.status.conditions or []):
            conditions[cond.type] = (cond.status == "True")

        return PodInfo(
            name=pod.metadata.name,
            namespace=pod.metadata.namespace,
            phase=pod.status.phase or "Unknown",
            ready=overall_ready and (pod.status.phase == "Running"),
            restart_count=total_restarts,
            node_name=pod.spec.node_name,
            pod_ip=pod.status.pod_ip,
            created_at=pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
            containers=containers,
            labels=pod.metadata.labels or {},
            termination_reason=overall_termination_reason,
            conditions=conditions
        )

    def _parse_deployment(self, dep) -> DeploymentInfo:
        """Helper to convert raw V1Deployment to structured DeploymentInfo."""
        images = []
        if dep.spec.template.spec.containers:
            images = [c.image for c in dep.spec.template.spec.containers]

        conditions = {}
        if dep.status.conditions:
            for cond in dep.status.conditions:
                conditions[cond.type] = cond.status

        return DeploymentInfo(
            name=dep.metadata.name,
            namespace=dep.metadata.namespace,
            desired_replicas=dep.spec.replicas or 0,
            ready_replicas=dep.status.ready_replicas or 0,
            available_replicas=dep.status.available_replicas or 0,
            updated_replicas=dep.status.updated_replicas or 0,
            images=images,
            labels=dep.metadata.labels or {},
            conditions=conditions,
            generation=dep.metadata.generation or 1,
            observed_generation=dep.status.observed_generation or 1,
            strategy=dep.spec.strategy.type if dep.spec.strategy else None
        )

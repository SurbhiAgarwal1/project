from datetime import datetime, timezone
import logging
from typing import Dict, Any, Optional
from kubernetes.client.rest import ApiException
from app.kubernetes.client import get_k8s_client_manager, KubernetesClientManager

logger = logging.getLogger("opsara.kubernetes.mutation")


class KubernetesMutationClient:
    """Executes validated, human-approved mutating operations against the live Kubernetes cluster.

    Never invoked directly from raw LLM tool calls.
    """

    def __init__(self, client_manager: Optional[KubernetesClientManager] = None):
        self.client_mgr = client_manager or get_k8s_client_manager()

    def restart_deployment(self, namespace: str, deployment_name: str) -> Dict[str, Any]:
        """Performs a rolling restart of a deployment by updating its restart timestamp annotation."""
        apps = self.client_mgr.apps_v1
        now_iso = datetime.now(timezone.utc).isoformat()
        body = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": now_iso
                        }
                    }
                }
            }
        }
        try:
            logger.info(f"Restarting deployment '{deployment_name}' in namespace '{namespace}'...")
            res = apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
            return {
                "status": "success",
                "action": "restart_deployment",
                "target": deployment_name,
                "namespace": namespace,
                "restarted_at": now_iso,
                "generation": res.metadata.generation
            }
        except ApiException as e:
            logger.error(f"Failed to restart deployment '{deployment_name}': {e}")
            raise RuntimeError(f"Kubernetes API error restarting deployment: {e.reason}") from e

    def rollback_deployment(self, namespace: str, deployment_name: str) -> Dict[str, Any]:
        """Rolls back deployment to previous ReplicaSet revision or resets image/config."""
        apps = self.client_mgr.apps_v1
        core = self.client_mgr.core_v1
        try:
            logger.info(f"Finding previous ReplicaSets for deployment '{deployment_name}' in '{namespace}'...")
            # Query replicasets owned by this deployment
            rs_list = apps.list_namespaced_replica_set(
                namespace=namespace,
                label_selector=f"app={deployment_name}"
            )
            replicasets = sorted(
                rs_list.items,
                key=lambda rs: int(rs.metadata.annotations.get("deployment.kubernetes.io/revision", 0)),
                reverse=True
            )

            if len(replicasets) >= 2:
                prev_rs = replicasets[1]
                prev_template = prev_rs.spec.template
                body = {
                    "spec": {
                        "template": {
                            "spec": {
                                "containers": [
                                    {
                                        "name": c.name,
                                        "image": c.image,
                                        "env": [
                                            {"name": e.name, "value": e.value}
                                            for e in (c.env or [])
                                        ]
                                    }
                                    for c in prev_template.spec.containers
                                ]
                            }
                        }
                    }
                }
                res = apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
                return {
                    "status": "success",
                    "action": "rollback_deployment",
                    "target": deployment_name,
                    "namespace": namespace,
                    "restored_revision": prev_rs.metadata.annotations.get("deployment.kubernetes.io/revision"),
                    "generation": res.metadata.generation
                }
            else:
                # If no previous revision found, patch APP_MODE back to 'normal' as a standard fallback recovery
                body = {
                    "spec": {
                        "template": {
                            "spec": {
                                "containers": [
                                    {
                                        "name": deployment_name,
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
                res = apps.patch_namespaced_deployment(name=deployment_name, namespace=namespace, body=body)
                return {
                    "status": "success",
                    "action": "rollback_deployment",
                    "target": deployment_name,
                    "namespace": namespace,
                    "note": "Restored baseline container configuration",
                    "generation": res.metadata.generation
                }
        except ApiException as e:
            logger.error(f"Failed to rollback deployment '{deployment_name}': {e}")
            raise RuntimeError(f"Kubernetes API error rolling back deployment: {e.reason}") from e

    def scale_deployment(self, namespace: str, deployment_name: str, replicas: int) -> Dict[str, Any]:
        """Scales deployment to the specified replica count."""
        apps = self.client_mgr.apps_v1
        body = {"spec": {"replicas": replicas}}
        try:
            res = apps.patch_namespaced_deployment_scale(name=deployment_name, namespace=namespace, body=body)
            return {
                "status": "success",
                "action": "scale_deployment",
                "target": deployment_name,
                "namespace": namespace,
                "replicas": res.spec.replicas
            }
        except ApiException as e:
            logger.error(f"Failed to scale deployment '{deployment_name}': {e}")
            raise RuntimeError(f"Kubernetes API error scaling deployment: {e.reason}") from e

import logging
import time
from typing import Optional, Tuple
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from app.config.settings import get_settings

logger = logging.getLogger("opsara.kubernetes")


class KubernetesClientManager:
    """Manages Kubernetes API clients with safe connection loading and error reporting."""

    def __init__(self, kubeconfig_path: Optional[str] = None):
        self.kubeconfig_path = kubeconfig_path or get_settings().KUBECONFIG_PATH
        self._is_connected = False
        self._server_version: Optional[str] = None
        self._api_client: Optional[client.ApiClient] = None
        self._core_v1: Optional[client.CoreV1Api] = None
        self._apps_v1: Optional[client.AppsV1Api] = None
        self._version_api: Optional[client.VersionApi] = None
        self._last_connected_check: float = 0.0
        self._cached_connected: bool = False
        self._init_clients()

    def _init_clients(self):
        try:
            if self.kubeconfig_path:
                logger.info(f"Loading kubeconfig from explicit path: {self.kubeconfig_path}")
                config.load_kube_config(config_file=self.kubeconfig_path)
            else:
                try:
                    logger.info("Attempting in-cluster Kubernetes configuration...")
                    config.load_incluster_config()
                except config.ConfigException:
                    logger.info("Falling back to default kubeconfig (~/.kube/config)...")
                    config.load_kube_config()

            conf = client.Configuration.get_default_copy()
            conf.retries = 0
            self._api_client = client.ApiClient(configuration=conf)
            self._core_v1 = client.CoreV1Api(self._api_client)
            self._apps_v1 = client.AppsV1Api(self._api_client)
            self._version_api = client.VersionApi(self._api_client)

            # Test connection with fast timeout
            version_info = self._version_api.get_code(_request_timeout=1.0)
            self._server_version = f"{version_info.major}.{version_info.minor} ({version_info.git_version})"
            self._is_connected = True
            self._cached_connected = True
            self._last_connected_check = time.time()
            logger.info(f"Successfully connected to Kubernetes cluster. Server version: {self._server_version}")

        except Exception as e:
            self._is_connected = False
            self._cached_connected = False
            self._last_connected_check = time.time()
            self._server_version = None
            logger.warning(f"Failed to connect to Kubernetes cluster: {str(e)}")

    def is_connected(self, force: bool = False) -> bool:
        """Check if Kubernetes cluster is currently reachable with 10s cooldown caching."""
        now = time.time()
        if not force and (now - self._last_connected_check < 10.0):
            return self._cached_connected

        self._last_connected_check = now
        try:
            if self._version_api:
                version_info = self._version_api.get_code(_request_timeout=1.0)
                if not self._server_version:
                    self._server_version = f"{version_info.major}.{version_info.minor} ({version_info.git_version})"
                self._is_connected = True
                self._cached_connected = True
                return True
        except Exception as e:
            logger.debug(f"Connection check failed: {e}")
            self._is_connected = False
            self._cached_connected = False
        return False

    def get_server_version(self) -> Optional[str]:
        return self._server_version

    @property
    def core_v1(self) -> client.CoreV1Api:
        if not self._core_v1:
            self._init_clients()
        if not self._core_v1:
            raise ConnectionError("Kubernetes CoreV1Api unavailable. Cluster is not reachable.")
        return self._core_v1

    @property
    def apps_v1(self) -> client.AppsV1Api:
        if not self._apps_v1:
            self._init_clients()
        if not self._apps_v1:
            raise ConnectionError("Kubernetes AppsV1Api unavailable. Cluster is not reachable.")
        return self._apps_v1

    def reload(self):
        """Force reloading kubeconfig connection."""
        self._init_clients()


_client_manager: Optional[KubernetesClientManager] = None


def get_k8s_client_manager() -> KubernetesClientManager:
    global _client_manager
    if _client_manager is None:
        _client_manager = KubernetesClientManager()
    return _client_manager

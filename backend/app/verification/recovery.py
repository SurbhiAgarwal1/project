import asyncio
import logging
from typing import Dict, Any, List, Tuple
from app.kubernetes.read_client import KubernetesReadClient
from app.schemas.cluster import HealthCheckResult

logger = logging.getLogger("opsara.verification")


class VerificationEngine:
    """Performs deterministic, multi-point verification of service recovery after remediation.

    Does NOT rely on LLM guessing or self-proclamation.
    """

    def __init__(self, read_client: KubernetesReadClient):
        self.read_client = read_client

    async def verify_workload_recovery(
        self,
        namespace: str,
        service: str,
        health_check_url: str = "http://127.0.0.1:30080/health",
        settle_delay_seconds: int = 4
    ) -> Tuple[bool, List[Dict[str, Any]], str]:
        """Runs the deterministic recovery verification suite against the cluster."""
        checks: List[Dict[str, Any]] = []

        logger.info(f"Allowing {settle_delay_seconds}s for Kubernetes state transition...")
        await asyncio.sleep(settle_delay_seconds)

        # Check 1: Deployment Available Replicas vs Desired Replicas
        dep = self.read_client.get_deployment(namespace=namespace, deployment_name=service)
        if not dep:
            checks.append({
                "name": "Deployment Existence",
                "passed": False,
                "detail": f"Deployment '{service}' not found in namespace '{namespace}'."
            })
            return False, checks, f"Deployment '{service}' does not exist in '{namespace}'."

        desired = dep.desired_replicas
        ready = dep.ready_replicas
        available = dep.available_replicas

        dep_check_passed = (ready >= desired and available >= desired and desired > 0)
        checks.append({
            "name": "Deployment Replicas Ready",
            "passed": dep_check_passed,
            "detail": f"{ready}/{desired} replicas ready, {available} available."
        })

        # Check 2: Pod Health & Absence of CrashLoop/OOMKilled
        pods = self.read_client.list_pods(namespace=namespace, label_selector=f"app={service}")
        unhealthy_pods = []
        for pod in pods:
            if not pod.ready or pod.phase != "Running":
                unhealthy_pods.append(f"{pod.name} ({pod.phase}, ready={pod.ready}, reason={pod.termination_reason or 'None'})")

        pods_check_passed = (len(unhealthy_pods) == 0 and len(pods) >= desired)
        checks.append({
            "name": "Pod Readiness and Phase",
            "passed": pods_check_passed,
            "detail": "All pods running and ready." if pods_check_passed else f"Unhealthy pods detected: {', '.join(unhealthy_pods)}"
        })

        # Check 3: Live Health Endpoint Probe
        health_res = await self._probe_health(health_check_url, service)
        health_check_passed = health_res.is_healthy
        checks.append({
            "name": "HTTP Health Probe",
            "passed": health_check_passed,
            "detail": f"HTTP {health_res.status_code} in {health_res.latency_ms}ms" if health_check_passed else f"Probe failed: {health_res.error}"
        })

        # Check 4: Kubernetes Warning Events
        events = self.read_client.get_events(namespace=namespace, involved_name=service)
        recent_warnings = [e for e in events if e.type == "Warning" and e.reason in ("BackOff", "Unhealthy", "FailedCreate")]
        events_check_passed = (len(recent_warnings) == 0)
        checks.append({
            "name": "Cluster Event Log Cleanliness",
            "passed": events_check_passed,
            "detail": "No active warning events." if events_check_passed else f"{len(recent_warnings)} active warning events observed in namespace."
        })

        # Overall verdict: requires deployment ready + pods ready + health probe HTTP 200
        overall_passed = dep_check_passed and pods_check_passed and health_check_passed

        if overall_passed:
            summary = f"All verification checks passed: {ready}/{desired} replicas ready, HTTP /health returned 200 OK."
        else:
            failed_checks = [c["name"] for c in checks if not c["passed"]]
            summary = f"Verification failed. Checks failed: {', '.join(failed_checks)}."

        return overall_passed, checks, summary

    async def _probe_health(self, url: str, service: str) -> HealthCheckResult:
        import time
        import httpx
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                latency = round((time.time() - start) * 1000, 2)
                return HealthCheckResult(
                    service=service,
                    url=url,
                    status_code=res.status_code,
                    latency_ms=latency,
                    is_healthy=(res.status_code == 200),
                    response_body=res.json() if res.status_code == 200 else None,
                    error=None if res.status_code == 200 else f"HTTP {res.status_code}"
                )
        except Exception as e:
            return HealthCheckResult(
                service=service,
                url=url,
                status_code=None,
                latency_ms=round((time.time() - start) * 1000, 2),
                is_healthy=False,
                error=str(e)
            )

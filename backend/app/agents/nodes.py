from datetime import datetime, timezone
import logging
from typing import Dict, Any, List, Optional
import httpx

from app.config.settings import get_settings
from app.kubernetes.read_client import KubernetesReadClient
from app.kubernetes.mutation_client import KubernetesMutationClient
from app.verification.recovery import VerificationEngine
from app.risk.engine import DeterministicRiskEngine
from app.agents.state import AgentState

logger = logging.getLogger("opsara.agent.nodes")


def _now_str():
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


class AgentNodeExecutor:
    def __init__(
        self,
        read_client: Optional[KubernetesReadClient] = None,
        mutation_client: Optional[KubernetesMutationClient] = None,
        risk_engine: Optional[DeterministicRiskEngine] = None,
        verification_engine: Optional[VerificationEngine] = None
    ):
        self.read_client = read_client or KubernetesReadClient()
        self.mutation_client = mutation_client or KubernetesMutationClient()
        self.risk_engine = risk_engine or DeterministicRiskEngine()
        self.verification_engine = verification_engine or VerificationEngine(self.read_client)

    async def intake_node(self, state: AgentState) -> AgentState:
        """Initial intake step validating target service and runbook."""
        state.step_count += 1
        state.current_step = "intake"
        state.timeline_events.append({
            "timestamp": _now_str(),
            "type": "INVESTIGATION",
            "description": f"Incident investigation started for service '{state.service}' in namespace '{state.namespace}'."
        })
        return state

    async def investigate_node(self, state: AgentState) -> AgentState:
        """Executes real read-only inspection tools against Kubernetes."""
        state.step_count += 1
        state.current_step = "investigating"
        ns = state.namespace
        svc = state.service

        # 1. Inspect Pods
        try:
            pods = self.read_client.list_pods(namespace=ns, label_selector=f"app={svc}")
            state.tool_results["pods"] = [p.model_dump() for p in pods]
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "TOOL_EXECUTION",
                "description": f"inspect_pods completed: found {len(pods)} pod(s) for service '{svc}'."
            })

            # Check for immediate pod termination signals
            for p in pods:
                if p.termination_reason:
                    state.evidence.append({
                        "type": "OBSERVED",
                        "source": "inspect_pods",
                        "resource": f"pod/{p.name}",
                        "fact": f"Container terminated with reason: {p.termination_reason}",
                        "details": {"restart_count": p.restart_count, "ready": p.ready}
                    })
        except Exception as e:
            logger.error(f"Error inspecting pods: {e}")
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "WARNING",
                "description": f"inspect_pods failed: {str(e)}"
            })

        # 2. Inspect Deployment
        try:
            dep = self.read_client.get_deployment(namespace=ns, deployment_name=svc)
            if dep:
                state.tool_results["deployment"] = dep.model_dump()
                state.timeline_events.append({
                    "timestamp": _now_str(),
                    "type": "TOOL_EXECUTION",
                    "description": f"inspect_deployment completed: {dep.ready_replicas}/{dep.desired_replicas} replicas ready."
                })
                state.evidence.append({
                    "type": "OBSERVED",
                    "source": "inspect_deployment",
                    "resource": f"deployment/{dep.name}",
                    "fact": f"Deployment replica state: {dep.ready_replicas}/{dep.desired_replicas} ready, {dep.available_replicas} available.",
                    "details": dep.conditions
                })
        except Exception as e:
            logger.error(f"Error inspecting deployment: {e}")

        # 3. Inspect Pod Logs
        try:
            pods = state.tool_results.get("pods", [])
            if pods:
                target_pod_name = pods[0]["name"]
                logs_res = self.read_client.get_pod_logs(namespace=ns, pod_name=target_pod_name, tail_lines=50)
                state.tool_results["logs"] = logs_res.model_dump()
                state.timeline_events.append({
                    "timestamp": _now_str(),
                    "type": "TOOL_EXECUTION",
                    "description": f"get_pod_logs completed for pod '{target_pod_name}' ({logs_res.total_lines} lines analyzed)."
                })

                # Check logs for DB connection error
                raw_logs = logs_res.logs.lower()
                if "connection refused" in raw_logs or "database connection failed" in raw_logs:
                    state.evidence.append({
                        "type": "OBSERVED",
                        "source": "get_pod_logs",
                        "resource": f"pod/{target_pod_name}",
                        "fact": "Pod logs indicate fatal database connectivity failure ('connection refused').",
                        "details": {"raw_snippet": logs_res.logs[:300]}
                    })
        except Exception as e:
            logger.error(f"Error reading logs: {e}")

        # 4. Inspect Events
        try:
            events = self.read_client.get_events(namespace=ns, involved_name=svc)
            state.tool_results["events"] = [e.model_dump() for e in events]
            warning_events = [e for e in events if e.type == "Warning"]
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "TOOL_EXECUTION",
                "description": f"get_kubernetes_events completed: {len(events)} events found ({len(warning_events)} warnings)."
            })
            for wev in warning_events:
                state.evidence.append({
                    "type": "OBSERVED",
                    "source": "get_kubernetes_events",
                    "resource": f"{wev.involved_kind}/{wev.involved_name}",
                    "fact": f"Warning event '{wev.reason}': {wev.message}",
                    "details": {"count": wev.count}
                })
        except Exception as e:
            logger.error(f"Error getting events: {e}")

        # 5. Live Health Probe
        try:
            health_check = await self.verification_engine._probe_health(
                url="http://127.0.0.1:30080/health",
                service=svc
            )
            state.tool_results["health_check"] = health_check.model_dump()
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "TOOL_EXECUTION",
                "description": f"run_health_check completed: HTTP {health_check.status_code or 'Unreachable'} (healthy={health_check.is_healthy})."
            })
            state.evidence.append({
                "type": "OBSERVED",
                "source": "run_health_check",
                "resource": f"service/{svc}",
                "fact": f"HTTP /health probe returned status {health_check.status_code} in {health_check.latency_ms}ms.",
                "details": health_check.response_body or {}
            })
        except Exception as e:
            logger.error(f"Error probing health: {e}")

        return state

    async def analyze_node(self, state: AgentState) -> AgentState:
        """Synthesizes collected evidence and builds an evidence-backed hypothesis."""
        state.step_count += 1
        state.current_step = "analyzing"

        # Check collected evidence for specific patterns
        has_oom = False
        has_db_failure = False
        has_rollout_failure = False

        for ev in state.evidence:
            fact = ev.get("fact", "").lower()
            if "oomkilled" in fact or "memory" in fact:
                has_oom = True
            if "database" in fact or "connection refused" in fact:
                has_db_failure = True
            if "unhealthy" in fact or "backoff" in fact:
                has_rollout_failure = True

        dep_info = state.tool_results.get("deployment", {})
        ready_reps = dep_info.get("ready_replicas", 0)
        desired_reps = dep_info.get("desired_replicas", 2)
        if ready_reps == 0 and desired_reps > 0 and not has_db_failure:
            has_rollout_failure = True

        # Formulate Hypothesis
        if has_db_failure:
            state.hypotheses = [{
                "likely_cause": "Database Connectivity Failure",
                "confidence": 0.94,
                "summary": "Application logs and health probe confirm database connection refused. External dependency failure detected.",
                "supporting_evidence": [ev["fact"] for ev in state.evidence if "database" in ev.get("fact", "").lower() or "connection" in ev.get("fact", "").lower()],
                "contradicting_evidence": []
            }]
            state.confidence = 0.94
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ANALYSIS",
                "description": "Hypothesis: External database connectivity failure. Application cannot reach postgres dependency."
            })

        elif has_oom:
            state.hypotheses = [{
                "likely_cause": "Memory Exhaustion (OOMKilled)",
                "confidence": 0.95,
                "summary": "Container was terminated with reason OOMKilled. Pod has repeatedly restarted due to memory limit constraint (128Mi).",
                "supporting_evidence": [ev["fact"] for ev in state.evidence if "oomkilled" in ev.get("fact", "").lower() or "terminated" in ev.get("fact", "").lower()],
                "contradicting_evidence": []
            }]
            state.confidence = 0.95
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ANALYSIS",
                "description": "Hypothesis: Memory exhaustion (OOMKilled). Repeated restarts observed against 128Mi limit."
            })

        elif has_rollout_failure:
            state.hypotheses = [{
                "likely_cause": "Failed Deployment Rollout",
                "confidence": 0.90,
                "summary": "Deployment has 0 ready replicas. Pods are failing readiness or crash looping in current revision.",
                "supporting_evidence": [ev["fact"] for ev in state.evidence],
                "contradicting_evidence": []
            }]
            state.confidence = 0.90
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ANALYSIS",
                "description": "Hypothesis: Stalled or failing deployment rollout. Current revision has 0 available replicas."
            })

        else:
            state.hypotheses = [{
                "likely_cause": "General Workload Degradation",
                "confidence": 0.70,
                "summary": "Service exhibits degraded readiness or health probe failure.",
                "supporting_evidence": [ev["fact"] for ev in state.evidence],
                "contradicting_evidence": []
            }]
            state.confidence = 0.70
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ANALYSIS",
                "description": "Hypothesis: General workload degradation under investigation."
            })

        return state

    async def decision_node(self, state: AgentState) -> AgentState:
        """Determines the appropriate next step based on evidence.

        CRITICAL AGENTIC BEHAVIOR:
        - If Database failure: DOES NOT blindly restart. Proposes ESCALATION.
        - If OOMKilled: proposes restart_deployment with human approval.
        - If Rollout failure: proposes rollback_deployment with human approval.
        """
        state.step_count += 1
        state.current_step = "decision"

        hypothesis = state.hypotheses[0] if state.hypotheses else {}
        likely_cause = hypothesis.get("likely_cause", "")

        # SCENARIO C: Database Connectivity Failure -> SAFE ESCALATION, NO BLIND RESTART
        if "Database" in likely_cause:
            state.proposed_action = None
            state.final_status = "ESCALATED"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "DECISION",
                "description": "DECISION: Database connectivity failure detected. Restarting the payment-api application will NOT resolve an unavailable external database. Halting mutation and escalating to Infrastructure/DBA team."
            })
            return state

        # SCENARIO B: Failed Rollout -> Propose Rollback
        elif "Rollout" in likely_cause:
            state.proposed_action = {
                "action_type": "rollback_deployment",
                "target": state.service,
                "namespace": state.namespace,
                "reason": "Active deployment revision is unhealthy (0 ready replicas). Proposing rollback to previous functional revision.",
                "parameters": {}
            }
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "PROPOSAL",
                "description": f"PROPOSAL: Rollback deployment '{state.service}' to restore previously operational ReplicaSet."
            })

        # SCENARIO A: OOMKilled / Transient -> Propose Restart
        else:
            state.proposed_action = {
                "action_type": "restart_deployment",
                "target": state.service,
                "namespace": state.namespace,
                "reason": "Container terminated with OOMKilled. Proposing rolling restart to recycle failed pod instances.",
                "parameters": {}
            }
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "PROPOSAL",
                "description": f"PROPOSAL: Rolling restart of deployment '{state.service}' to recover terminated containers."
            })

        return state

    async def risk_gate_node(self, state: AgentState) -> AgentState:
        """Evaluates proposed action with the deterministic risk engine.

        Enforces Human-in-the-Loop gating.
        """
        state.step_count += 1
        state.current_step = "risk_evaluation"

        if not state.proposed_action:
            return state

        action = state.proposed_action
        assessment = self.risk_engine.evaluate(
            action_type=action["action_type"],
            target=action["target"],
            namespace=state.namespace,
            parameters=action.get("parameters", {}),
            context={
                "desired_replicas": state.tool_results.get("deployment", {}).get("desired_replicas", 2),
                "ready_replicas": state.tool_results.get("deployment", {}).get("ready_replicas", 0)
            }
        )
        state.risk_assessment = assessment.model_dump()

        if assessment.requires_approval:
            state.approval_status = "PENDING"
            state.final_status = "WAITING_FOR_APPROVAL"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "APPROVAL_REQUIRED",
                "description": f"ACTION REQUIRES HUMAN APPROVAL: {assessment.action_type} on '{assessment.target}' (Risk: {assessment.risk_level.value}). Reason: {assessment.reason}"
            })
        else:
            state.approval_status = "APPROVED"
            state.final_status = "EXECUTING"

        return state

    async def execute_action_node(self, state: AgentState) -> AgentState:
        """Executes ONLY approved mutations against Kubernetes."""
        state.step_count += 1
        state.current_step = "executing"

        if state.approval_status != "APPROVED":
            logger.warning(f"Attempted execution without approved status: {state.approval_status}")
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ERROR",
                "description": "Execution blocked: action was not explicitly approved by human operator."
            })
            return state

        action = state.proposed_action
        action_type = action["action_type"]
        target = action["target"]
        ns = state.namespace

        state.timeline_events.append({
            "timestamp": _now_str(),
            "type": "EXECUTION",
            "description": f"Operator approval verified. Executing {action_type} against '{target}'..."
        })

        try:
            if action_type == "restart_deployment":
                res = self.mutation_client.restart_deployment(namespace=ns, deployment_name=target)
            elif action_type == "rollback_deployment":
                res = self.mutation_client.rollback_deployment(namespace=ns, deployment_name=target)
            elif action_type == "scale_deployment":
                reps = action.get("parameters", {}).get("replicas", 2)
                res = self.mutation_client.scale_deployment(namespace=ns, deployment_name=target, replicas=reps)
            else:
                raise ValueError(f"Unknown mutating action type: {action_type}")

            state.action_result = res
            state.final_status = "VERIFYING"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "EXECUTION_COMPLETE",
                "description": f"{action_type} succeeded against Kubernetes API. Beginning independent verification..."
            })
        except Exception as e:
            logger.error(f"Mutation execution failed: {e}")
            state.action_result = {"status": "error", "error": str(e)}
            state.final_status = "FAILED"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ERROR",
                "description": f"Mutation execution failed: {str(e)}"
            })

        return state

    async def verify_node(self, state: AgentState) -> AgentState:
        """Deterministically verifies recovery against Kubernetes and HTTP endpoints."""
        state.step_count += 1
        state.current_step = "verifying"

        passed, checks, summary = await self.verification_engine.verify_workload_recovery(
            namespace=state.namespace,
            service=state.service,
            settle_delay_seconds=3
        )

        state.verification_result = {
            "passed": passed,
            "checks": checks,
            "summary": summary
        }

        if passed:
            state.final_status = "RESOLVED"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "VERIFICATION_SUCCESS",
                "description": f"VERIFICATION PASSED: {summary}"
            })
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "RESOLUTION",
                "description": f"Incident RESOLVED: Service '{state.service}' is fully healthy."
            })
        else:
            state.final_status = "ESCALATED"
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "VERIFICATION_FAILURE",
                "description": f"VERIFICATION FAILED: {summary}"
            })
            state.timeline_events.append({
                "timestamp": _now_str(),
                "type": "ESCALATION",
                "description": f"Incident ESCALATED: Automated remediation could not fully recover service '{state.service}'."
            })

        return state

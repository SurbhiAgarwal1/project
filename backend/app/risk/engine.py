from typing import Optional, Dict, Any, List
from app.risk.rules import RiskLevel, ActionType, RiskAssessment


class DeterministicRiskEngine:
    """Evaluates the risk of proposed actions deterministically.

    Never delegates safety gating or approval decisions to the LLM.
    """

    def evaluate(
        self,
        action_type: str,
        target: str,
        namespace: str,
        parameters: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> RiskAssessment:
        parameters = parameters or {}
        context = context or {}

        # 1. Read-only actions
        read_only_actions = {
            ActionType.INSPECT_PODS.value,
            ActionType.GET_POD_LOGS.value,
            ActionType.INSPECT_DEPLOYMENT.value,
            ActionType.GET_EVENTS.value,
            ActionType.RUN_HEALTH_CHECK.value,
            "inspect_pod",
            "describe_pod",
            "inspect_replicasets",
            "get_rollout_status"
        }

        if action_type in read_only_actions:
            return RiskAssessment(
                action_type=action_type,
                target=target,
                risk_level=RiskLevel.READ_ONLY,
                requires_approval=False,
                reason="Read-only diagnostic query. No infrastructure state modified.",
                expected_impact="Zero impact on cluster state.",
                rollback_available=True,
                factors=["Read-only operation"]
            )

        factors: List[str] = []
        is_prod = "prod" in namespace.lower()
        if is_prod:
            factors.append("Production namespace target")

        # 2. Restart deployment
        if action_type == ActionType.RESTART_DEPLOYMENT.value:
            desired = context.get("desired_replicas", 2)
            ready = context.get("ready_replicas", 0)

            factors.append(f"Rolling restart of deployment '{target}' ({ready}/{desired} replicas ready)")

            # If all replicas are unhealthy, restart risk is MEDIUM because service is already degraded
            if ready == 0:
                risk = RiskLevel.MEDIUM
                factors.append("Workload currently has 0 ready replicas; rolling restart will attempt cold start")
            else:
                risk = RiskLevel.MEDIUM

            return RiskAssessment(
                action_type=action_type,
                target=target,
                risk_level=risk,
                requires_approval=True,
                reason="Rolling restart will recycle active pods and re-initialize container processes.",
                expected_impact=f"Sequential replacement of {desired} pods using rolling update strategy.",
                rollback_available=True,
                factors=factors
            )

        # 3. Rollback deployment
        if action_type == ActionType.ROLLBACK_DEPLOYMENT.value:
            factors.append(f"Rollback deployment '{target}' to previous ReplicaSet revision")
            factors.append("Modifies active deployment template and image version")

            return RiskAssessment(
                action_type=action_type,
                target=target,
                risk_level=RiskLevel.HIGH,
                requires_approval=True,
                reason="Rollback replaces current deployment configuration with previous revision.",
                expected_impact="Pods will be recreated with the previous pod template and image version.",
                rollback_available=True,
                factors=factors
            )

        # 4. Scale deployment
        if action_type == ActionType.SCALE_DEPLOYMENT.value:
            replicas = parameters.get("replicas", 1)
            current = context.get("desired_replicas", 2)
            factors.append(f"Scaling deployment '{target}' from {current} to {replicas} replicas")

            if replicas == 0:
                risk = RiskLevel.CRITICAL
                factors.append("Scale to 0 causes total service outage")
            elif replicas < current:
                risk = RiskLevel.HIGH
                factors.append("Scaling down capacity")
            else:
                risk = RiskLevel.MEDIUM
                factors.append("Scaling up capacity")

            return RiskAssessment(
                action_type=action_type,
                target=target,
                risk_level=risk,
                requires_approval=True,
                reason=f"Altering replica count from {current} to {replicas}.",
                expected_impact=f"Adjusts running pod instances to {replicas}.",
                rollback_available=True,
                factors=factors
            )

        # 5. Destructive actions
        if "delete" in action_type.lower():
            factors.append("Destructive deletion of cluster resource")
            return RiskAssessment(
                action_type=action_type,
                target=target,
                risk_level=RiskLevel.CRITICAL,
                requires_approval=True,
                reason="Destructive resource deletion.",
                expected_impact="Resource and associated state will be permanently removed.",
                rollback_available=False,
                factors=factors
            )

        # Default fallback for unknown mutations
        factors.append("Unclassified mutating operation")
        return RiskAssessment(
            action_type=action_type,
            target=target,
            risk_level=RiskLevel.HIGH,
            requires_approval=True,
            reason="Unclassified mutating operation requires operator review.",
            expected_impact="Potential mutation of cluster state.",
            rollback_available=False,
            factors=factors
        )

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class RiskLevel(str, Enum):
    READ_ONLY = "READ_ONLY"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ActionType(str, Enum):
    INSPECT_PODS = "inspect_pods"
    GET_POD_LOGS = "get_pod_logs"
    INSPECT_DEPLOYMENT = "inspect_deployment"
    GET_EVENTS = "get_kubernetes_events"
    RUN_HEALTH_CHECK = "run_health_check"
    RESTART_DEPLOYMENT = "restart_deployment"
    ROLLBACK_DEPLOYMENT = "rollback_deployment"
    SCALE_DEPLOYMENT = "scale_deployment"
    DELETE_RESOURCE = "delete_resource"


class RiskAssessment(BaseModel):
    action_type: str
    target: str
    risk_level: RiskLevel
    requires_approval: bool
    reason: str
    expected_impact: str
    rollback_available: bool
    factors: List[str]

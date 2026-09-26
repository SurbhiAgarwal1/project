from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class AgentState(BaseModel):
    incident_id: str
    service: str
    namespace: str = "opsara-demo"
    runbook_id: Optional[str] = None
    current_step: str = "intake"
    step_count: int = 0
    max_steps: int = 20

    # Investigation & Evidence
    tool_results: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    hypotheses: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = 0.0

    # Decisions & Proposals
    proposed_action: Optional[Dict[str, Any]] = None  # {action_type, target, reason, parameters}
    risk_assessment: Optional[Dict[str, Any]] = None  # from deterministic risk engine
    approval_id: Optional[str] = None
    approval_status: str = "NONE"  # NONE, PENDING, APPROVED, REJECTED

    # Action & Verification
    action_result: Optional[Dict[str, Any]] = None
    verification_result: Optional[Dict[str, Any]] = None
    final_status: str = "INVESTIGATING"  # INVESTIGATING, WAITING_FOR_APPROVAL, EXECUTING, VERIFYING, RESOLVED, ESCALATED, FAILED

    # Timeline of real-time events for SSE
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)
    error_message: Optional[str] = None

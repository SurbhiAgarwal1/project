import pytest
from unittest.mock import MagicMock, AsyncMock
from app.risk.engine import DeterministicRiskEngine
from app.risk.rules import RiskLevel
from app.agents.state import AgentState
from app.agents.nodes import AgentNodeExecutor
from app.runbooks.catalog import get_runbook_catalog
from app.verification.recovery import VerificationEngine


def test_deterministic_risk_engine():
    """Verify safety gating: read-only actions pass automatically; mutations require approval."""
    engine = DeterministicRiskEngine()

    # 1. Read-only
    read_res = engine.evaluate(
        action_type="inspect_pods",
        target="payment-api",
        namespace="opsara-demo"
    )
    assert read_res.requires_approval is False
    assert read_res.risk_level == RiskLevel.READ_ONLY

    # 2. Restart deployment
    restart_res = engine.evaluate(
        action_type="restart_deployment",
        target="payment-api",
        namespace="opsara-demo",
        context={"desired_replicas": 2, "ready_replicas": 0}
    )
    assert restart_res.requires_approval is True
    assert restart_res.risk_level == RiskLevel.MEDIUM

    # 3. Rollback deployment
    rollback_res = engine.evaluate(
        action_type="rollback_deployment",
        target="payment-api",
        namespace="opsara-demo"
    )
    assert rollback_res.requires_approval is True
    assert rollback_res.risk_level == RiskLevel.HIGH

    # 4. Scale to zero (critical outage)
    scale_zero = engine.evaluate(
        action_type="scale_deployment",
        target="payment-api",
        namespace="opsara-demo",
        parameters={"replicas": 0},
        context={"desired_replicas": 2}
    )
    assert scale_zero.requires_approval is True
    assert scale_zero.risk_level == RiskLevel.CRITICAL


@pytest.mark.asyncio
async def test_agent_database_failure_does_not_blindly_restart():
    """CRITICAL AGENTIC SCENARIO: Agent detects DB failure and escalates instead of blindly restarting."""
    mock_read = MagicMock()
    mock_read.list_pods.return_value = []
    mock_read.get_deployment.return_value = None
    mock_read.get_events.return_value = []

    # Mock logs with DB connection refused
    mock_logs = MagicMock()
    mock_logs.logs = "ERROR: connection refused to postgres://payment-db.internal:5432. Retrying in 2s..."
    mock_logs.total_lines = 10
    mock_logs.model_dump.return_value = {"logs": mock_logs.logs, "total_lines": 10}
    mock_read.get_pod_logs.return_value = mock_logs

    executor = AgentNodeExecutor(read_client=mock_read)

    state = AgentState(
        incident_id="inc-test-db",
        service="payment-api",
        namespace="opsara-demo"
    )
    # Simulate DB error evidence
    state.evidence = [{
        "type": "OBSERVED",
        "source": "get_pod_logs",
        "fact": "Pod logs indicate fatal database connectivity failure ('connection refused').",
        "details": {}
    }]

    # Analyze
    state = await executor.analyze_node(state)
    assert "Database" in state.hypotheses[0]["likely_cause"]
    assert state.confidence > 0.90

    # Decision: MUST NOT PROPOSE RESTART
    state = await executor.decision_node(state)
    assert state.proposed_action is None
    assert state.final_status == "ESCALATED"
    assert any("Database connectivity failure detected" in ev["description"] for ev in state.timeline_events)


@pytest.mark.asyncio
async def test_agent_oom_proposes_restart_with_approval_gate():
    """SCENARIO A: Agent detects OOMKilled and proposes restart, which halts at the approval gate."""
    mock_read = MagicMock()
    mock_read.list_pods.return_value = []
    mock_read.get_deployment.return_value = None
    mock_read.get_events.return_value = []

    executor = AgentNodeExecutor(read_client=mock_read)

    state = AgentState(
        incident_id="inc-test-oom",
        service="payment-api",
        namespace="opsara-demo"
    )
    # Simulate OOMKilled evidence
    state.evidence = [{
        "type": "OBSERVED",
        "source": "inspect_pods",
        "fact": "Container terminated with reason: OOMKilled",
        "details": {"restart_count": 7, "ready": False}
    }]

    state = await executor.analyze_node(state)
    assert "OOMKilled" in state.hypotheses[0]["likely_cause"]

    state = await executor.decision_node(state)
    assert state.proposed_action is not None
    assert state.proposed_action["action_type"] == "restart_deployment"

    # Risk gate should enforce human approval
    state = await executor.risk_gate_node(state)
    assert state.approval_status == "PENDING"
    assert state.final_status == "WAITING_FOR_APPROVAL"


def test_runbook_catalog_loading():
    """Verify built-in runbooks are parsed and accessible."""
    catalog = get_runbook_catalog()
    assert "payment-api-recovery" in catalog
    assert len(catalog["payment-api-recovery"].steps) >= 5


@pytest.mark.asyncio
async def test_agent_refuses_to_guess_without_concrete_evidence():
    """ZERO-GUESSWORK TEST: Agent refuses to formulate root cause or propose mutation without verified evidence."""
    mock_read = MagicMock()
    executor = AgentNodeExecutor(read_client=mock_read)

    state = AgentState(
        incident_id="inc-test-inconclusive",
        service="payment-api",
        namespace="opsara-demo"
    )
    # Empty / inconclusive evidence
    state.evidence = []

    state = await executor.analyze_node(state)
    assert "Insufficient Telemetry" in state.hypotheses[0]["likely_cause"]
    assert state.confidence <= 0.30

    # Decision node must NOT propose any action
    state = await executor.decision_node(state)
    assert state.proposed_action is None
    assert state.final_status == "ESCALATED"
    assert any("Refusing to guess" in ev["description"] or "Inconclusive root cause" in ev["description"] for ev in state.timeline_events)

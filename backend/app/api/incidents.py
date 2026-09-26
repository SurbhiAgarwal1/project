import asyncio
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db, init_db
from app.database.repositories import (
    IncidentRepository,
    ApprovalRepository,
    ActionRepository,
    VerificationRepository,
    AuditRepository
)
from app.agents.graph import get_agent_graph, IncidentResponseGraph
from app.agents.state import AgentState

router = APIRouter()


class CreateIncidentRequest(BaseModel):
    title: str
    service: str = "payment-api"
    namespace: str = "opsara-demo"
    severity: str = "HIGH"
    runbook_id: Optional[str] = "payment-api-recovery"


# In-memory event queues for live SSE timeline updates per incident
_INCIDENT_STREAMS: Dict[str, List[asyncio.Queue]] = {}


def broadcast_event(incident_id: str, event_data: Dict[str, Any]):
    queues = _INCIDENT_STREAMS.get(incident_id, [])
    for q in queues:
        try:
            q.put_nowait(event_data)
        except Exception:
            pass


@router.post("", status_code=201)
async def create_incident(
    req: CreateIncidentRequest,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    repo = IncidentRepository(db)
    incident = await repo.create_incident(
        title=req.title,
        service=req.service,
        namespace=req.namespace,
        severity=req.severity,
        runbook_id=req.runbook_id
    )
    return {
        "id": incident.id,
        "title": incident.title,
        "service": incident.service,
        "namespace": incident.namespace,
        "status": incident.status,
        "severity": incident.severity,
        "runbook_id": incident.runbook_id,
        "created_at": incident.created_at.isoformat() if incident.created_at else None
    }


@router.get("")
async def list_incidents(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    repo = IncidentRepository(db)
    incidents = await repo.list_incidents(status=status, limit=limit)
    return [
        {
            "id": inc.id,
            "title": inc.title,
            "service": inc.service,
            "namespace": inc.namespace,
            "status": inc.status,
            "severity": inc.severity,
            "summary": inc.summary,
            "hypothesis": inc.hypothesis,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None
        }
        for inc in incidents
    ]


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    repo = IncidentRepository(db)
    inc = await repo.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        "id": inc.id,
        "title": inc.title,
        "service": inc.service,
        "namespace": inc.namespace,
        "status": inc.status,
        "severity": inc.severity,
        "runbook_id": inc.runbook_id,
        "summary": inc.summary,
        "hypothesis": inc.hypothesis,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
        "events": [
            {
                "id": ev.id,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "type": ev.event_type,
                "description": ev.description,
                "metadata": ev.event_metadata
            }
            for ev in (inc.events or [])
        ],
        "evidence": [
            {
                "id": e.id,
                "type": e.type,
                "source_tool": e.source_tool,
                "summary": e.summary,
                "observed_at": e.observed_at.isoformat() if e.observed_at else None,
                "payload": e.payload
            }
            for e in (inc.evidence or [])
        ],
        "approvals": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "target": a.target,
                "namespace": a.namespace,
                "reason": a.reason,
                "risk_level": a.risk_level,
                "status": a.status,
                "expected_impact": a.expected_impact,
                "rollback_available": a.rollback_available,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
            }
            for a in (inc.approvals or [])
        ],
        "verifications": [
            {
                "id": v.id,
                "status": v.status,
                "summary": v.summary,
                "checks": v.checks,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in (inc.verifications or [])
        ]
    }


@router.post("/{incident_id}/start")
async def start_investigation(
    incident_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    repo = IncidentRepository(db)
    inc = await repo.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    await repo.update_status(incident_id, "INVESTIGATING")

    # Launch agent workflow in background
    async def _execute_agent():
        from app.database.connection import async_session
        async with async_session() as bg_db:
            bg_repo = IncidentRepository(bg_db)
            bg_approval_repo = ApprovalRepository(bg_db)

            state = AgentState(
                incident_id=incident_id,
                service=inc.service,
                namespace=inc.namespace,
                runbook_id=inc.runbook_id
            )

            graph = get_agent_graph()
            final_state = await graph.run_investigation(state)

            # Persist timeline events and broadcast
            for ev in final_state.timeline_events:
                await bg_repo.add_event(
                    incident_id=incident_id,
                    event_type=ev.get("type", "INVESTIGATION"),
                    description=ev.get("description", ""),
                    metadata=ev
                )
                broadcast_event(incident_id, ev)

            # Persist collected evidence
            for ev_item in final_state.evidence:
                await bg_repo.add_evidence(
                    incident_id=incident_id,
                    evidence_type=ev_item.get("type", "OBSERVED"),
                    source_tool=ev_item.get("source", "tool"),
                    summary=ev_item.get("fact", ""),
                    payload=ev_item.get("details", {})
                )

            # If action was proposed and requires approval, persist ApprovalRequest
            if final_state.proposed_action and final_state.risk_assessment:
                risk = final_state.risk_assessment
                action = final_state.proposed_action
                approval = await bg_approval_repo.create_approval(
                    incident_id=incident_id,
                    action_type=action["action_type"],
                    target=action["target"],
                    namespace=final_state.namespace,
                    reason=action["reason"],
                    risk_level=risk["risk_level"],
                    expected_impact=risk.get("expected_impact"),
                    rollback_available=risk.get("rollback_available", True),
                    parameters=action.get("parameters")
                )
                final_state.approval_id = approval.id

            # Update incident status and hypothesis
            hypothesis = final_state.hypotheses[0] if final_state.hypotheses else None
            await bg_repo.update_status(
                incident_id=incident_id,
                status=final_state.final_status,
                hypothesis=hypothesis,
                summary=hypothesis.get("summary") if hypothesis else None
            )

    background_tasks.add_task(_execute_agent)
    return {"status": "started", "incident_id": incident_id}


@router.get("/{incident_id}/events/stream")
async def stream_incident_events(incident_id: str):
    """Server-Sent Events (SSE) stream for live real-time timeline updates in the frontend."""
    queue = asyncio.Queue()
    if incident_id not in _INCIDENT_STREAMS:
        _INCIDENT_STREAMS[incident_id] = []
    _INCIDENT_STREAMS[incident_id].append(queue)

    async def event_generator():
        try:
            # Yield initial connection confirmation
            yield f"data: {json.dumps({'type': 'CONNECTED', 'description': 'Connected to live incident timeline stream.'})}\n\n"
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if incident_id in _INCIDENT_STREAMS and queue in _INCIDENT_STREAMS[incident_id]:
                _INCIDENT_STREAMS[incident_id].remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

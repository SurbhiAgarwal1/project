from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db, init_db, async_session
from app.database.repositories import (
    ApprovalRepository,
    IncidentRepository,
    ActionRepository,
    VerificationRepository
)
from app.api.incidents import broadcast_event
from app.agents.graph import get_agent_graph
from app.agents.state import AgentState

router = APIRouter()


class ResolveApprovalRequest(BaseModel):
    operator: str = "SRE Operator"


@router.get("")
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    await init_db()
    repo = ApprovalRepository(db)
    approvals = await repo.list_pending_approvals()
    return [
        {
            "id": a.id,
            "incident_id": a.incident_id,
            "action_type": a.action_type,
            "target": a.target,
            "namespace": a.namespace,
            "reason": a.reason,
            "risk_level": a.risk_level,
            "status": a.status,
            "expected_impact": a.expected_impact,
            "rollback_available": a.rollback_available,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in approvals
    ]


@router.post("/{approval_id}/approve")
async def approve_action(
    approval_id: str,
    req: ResolveApprovalRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    approval_repo = ApprovalRepository(db)
    incident_repo = IncidentRepository(db)
    action_repo = ActionRepository(db)

    approval = await approval_repo.get_approval(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Approval request already in state '{approval.status}'")

    # Mark approved
    await approval_repo.resolve_approval(approval_id, approved=True, operator=req.operator)
    await incident_repo.update_status(approval.incident_id, "EXECUTING")

    broadcast_event(approval.incident_id, {
        "type": "APPROVED",
        "description": f"Operator '{req.operator}' granted approval for {approval.action_type} on '{approval.target}'."
    })

    # Execute and verify in background
    async def _execute_and_verify():
        async with async_session() as bg_db:
            bg_inc_repo = IncidentRepository(bg_db)
            bg_act_repo = ActionRepository(bg_db)
            bg_ver_repo = VerificationRepository(bg_db)

            # Record action execution start
            exec_record = await bg_act_repo.create_execution(
                approval_id=approval_id,
                incident_id=approval.incident_id,
                action_type=approval.action_type,
                target=approval.target
            )

            state = AgentState(
                incident_id=approval.incident_id,
                service=approval.target,
                namespace=approval.namespace,
                proposed_action={
                    "action_type": approval.action_type,
                    "target": approval.target,
                    "parameters": approval.parameters or {}
                },
                approval_status="APPROVED"
            )

            graph = get_agent_graph()
            final_state = await graph.resume_approved_action(state)

            # Record execution result
            succeeded = (final_state.final_status in ("RESOLVED", "VERIFYING"))
            await bg_act_repo.complete_execution(
                execution_id=exec_record.id,
                succeeded=succeeded,
                result=final_state.action_result,
                error=final_state.error_message
            )

            # Record verification result
            ver = final_state.verification_result or {}
            await bg_ver_repo.record_verification(
                incident_id=approval.incident_id,
                passed=ver.get("passed", False),
                checks=ver.get("checks", []),
                summary=ver.get("summary", "Verification finished")
            )

            # Broadcast timeline events
            for ev in final_state.timeline_events:
                await bg_inc_repo.add_event(
                    incident_id=approval.incident_id,
                    event_type=ev.get("type", "EXECUTION"),
                    description=ev.get("description", ""),
                    metadata=ev
                )
                broadcast_event(approval.incident_id, ev)

            # Update final incident status
            await bg_inc_repo.update_status(
                incident_id=approval.incident_id,
                status=final_state.final_status
            )

    background_tasks.add_task(_execute_and_verify)
    return {"status": "approved", "approval_id": approval_id}


@router.post("/{approval_id}/reject")
async def reject_action(
    approval_id: str,
    req: ResolveApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    await init_db()
    approval_repo = ApprovalRepository(db)
    incident_repo = IncidentRepository(db)

    approval = await approval_repo.get_approval(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Approval request already in state '{approval.status}'")

    await approval_repo.resolve_approval(approval_id, approved=False, operator=req.operator)
    await incident_repo.update_status(approval.incident_id, "ESCALATED")

    ev = {
        "type": "REJECTED",
        "description": f"Operator '{req.operator}' rejected {approval.action_type}. Remediation halted and incident escalated."
    }
    await incident_repo.add_event(
        incident_id=approval.incident_id,
        event_type="REJECTED",
        description=ev["description"]
    )
    broadcast_event(approval.incident_id, ev)
    return {"status": "rejected", "approval_id": approval_id}

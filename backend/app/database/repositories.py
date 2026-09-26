from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import (
    Incident,
    IncidentEvent,
    Evidence,
    ApprovalRequest,
    ActionExecution,
    VerificationResult,
    AuditLog,
    Runbook
)


class IncidentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_incident(
        self,
        title: str,
        service: str,
        namespace: str = "opsara-demo",
        severity: str = "HIGH",
        runbook_id: Optional[str] = None
    ) -> Incident:
        incident = Incident(
            title=title,
            service=service,
            namespace=namespace,
            severity=severity,
            runbook_id=runbook_id,
            status="OPEN"
        )
        self.session.add(incident)
        await self.session.flush()

        # Add creation event
        event = IncidentEvent(
            incident_id=incident.id,
            event_type="INVESTIGATION",
            description=f"Incident opened: '{title}' targeting service '{service}' in namespace '{namespace}'."
        )
        self.session.add(event)

        # Add audit log
        audit = AuditLog(
            incident_id=incident.id,
            actor="SYSTEM",
            action="INCIDENT_CREATED",
            target=f"{namespace}/{service}",
            risk="LOW",
            result={"title": title, "severity": severity}
        )
        self.session.add(audit)
        await self.session.commit()
        return incident

    async def get_incident(self, incident_id: str) -> Optional[Incident]:
        stmt = (
            select(Incident)
            .where(Incident.id == incident_id)
            .options(
                selectinload(Incident.events),
                selectinload(Incident.evidence),
                selectinload(Incident.approvals),
                selectinload(Incident.actions),
                selectinload(Incident.verifications),
                selectinload(Incident.audit_logs)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_incidents(self, status: Optional[str] = None, limit: int = 50) -> List[Incident]:
        stmt = select(Incident).order_by(desc(Incident.created_at)).limit(limit)
        if status:
            stmt = stmt.where(Incident.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self,
        incident_id: str,
        status: str,
        hypothesis: Optional[Dict[str, Any]] = None,
        summary: Optional[str] = None
    ):
        values: Dict[str, Any] = {"status": status, "updated_at": datetime.now(timezone.utc)}
        if hypothesis is not None:
            values["hypothesis"] = hypothesis
        if summary is not None:
            values["summary"] = summary

        await self.session.execute(
            update(Incident).where(Incident.id == incident_id).values(**values)
        )
        await self.session.commit()

    async def add_event(
        self,
        incident_id: str,
        event_type: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> IncidentEvent:
        event = IncidentEvent(
            incident_id=incident_id,
            event_type=event_type,
            description=description,
            event_metadata=metadata
        )
        self.session.add(event)
        await self.session.commit()
        return event

    async def add_evidence(
        self,
        incident_id: str,
        evidence_type: str,
        source_tool: str,
        summary: str,
        payload: Dict[str, Any]
    ) -> Evidence:
        ev = Evidence(
            incident_id=incident_id,
            type=evidence_type,
            source_tool=source_tool,
            summary=summary,
            payload=payload
        )
        self.session.add(ev)
        await self.session.commit()
        return ev

    async def get_evidence(self, incident_id: str) -> List[Evidence]:
        stmt = select(Evidence).where(Evidence.incident_id == incident_id).order_by(desc(Evidence.observed_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ApprovalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_approval(
        self,
        incident_id: str,
        action_type: str,
        target: str,
        namespace: str,
        reason: str,
        risk_level: str,
        expected_impact: Optional[str] = None,
        rollback_available: bool = True,
        parameters: Optional[Dict[str, Any]] = None
    ) -> ApprovalRequest:
        approval = ApprovalRequest(
            incident_id=incident_id,
            action_type=action_type,
            target=target,
            namespace=namespace,
            reason=reason,
            risk_level=risk_level,
            expected_impact=expected_impact,
            rollback_available=rollback_available,
            parameters=parameters,
            status="PENDING"
        )
        self.session.add(approval)
        await self.session.flush()

        audit = AuditLog(
            incident_id=incident_id,
            actor="AGENT",
            action="APPROVAL_REQUESTED",
            target=target,
            risk=risk_level,
            result={"action_type": action_type, "approval_id": approval.id}
        )
        self.session.add(audit)
        await self.session.commit()
        return approval

    async def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        stmt = select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_pending_approvals(self) -> List[ApprovalRequest]:
        stmt = select(ApprovalRequest).where(ApprovalRequest.status == "PENDING").order_by(desc(ApprovalRequest.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def resolve_approval(
        self,
        approval_id: str,
        approved: bool,
        operator: str = "Operator"
    ) -> Optional[ApprovalRequest]:
        approval = await self.get_approval(approval_id)
        if not approval or approval.status != "PENDING":
            return None

        approval.status = "APPROVED" if approved else "REJECTED"
        approval.resolved_at = datetime.now(timezone.utc)
        approval.resolved_by = operator

        audit = AuditLog(
            incident_id=approval.incident_id,
            actor="USER",
            action="APPROVAL_GRANTED" if approved else "APPROVAL_REJECTED",
            target=approval.target,
            risk=approval.risk_level,
            result={"approval_id": approval.id, "operator": operator}
        )
        self.session.add(audit)
        await self.session.commit()
        return approval


class ActionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_execution(
        self,
        approval_id: str,
        incident_id: str,
        action_type: str,
        target: str
    ) -> ActionExecution:
        execution = ActionExecution(
            approval_id=approval_id,
            incident_id=incident_id,
            action_type=action_type,
            target=target,
            status="EXECUTING",
            started_at=datetime.now(timezone.utc)
        )
        self.session.add(execution)
        await self.session.commit()
        return execution

    async def complete_execution(
        self,
        execution_id: str,
        succeeded: bool,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> Optional[ActionExecution]:
        stmt = select(ActionExecution).where(ActionExecution.id == execution_id)
        res = await self.session.execute(stmt)
        execution = res.scalars().first()
        if not execution:
            return None

        execution.status = "SUCCEEDED" if succeeded else "FAILED"
        execution.completed_at = datetime.now(timezone.utc)
        execution.result = result
        execution.error = error

        audit = AuditLog(
            incident_id=execution.incident_id,
            actor="SYSTEM",
            action="MUTATION_EXECUTED",
            target=execution.target,
            risk="HIGH",
            result={"status": execution.status, "execution_id": execution.id, "error": error}
        )
        self.session.add(audit)
        await self.session.commit()
        return execution


class VerificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def record_verification(
        self,
        incident_id: str,
        passed: bool,
        checks: List[Dict[str, Any]],
        summary: str
    ) -> VerificationResult:
        res = VerificationResult(
            incident_id=incident_id,
            status="PASSED" if passed else "FAILED",
            checks={"items": checks},
            summary=summary
        )
        self.session.add(res)
        await self.session.commit()
        return res


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_audit_logs(self, incident_id: Optional[str] = None, limit: int = 100) -> List[AuditLog]:
        stmt = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
        if incident_id:
            stmt = stmt.where(AuditLog.incident_id == incident_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

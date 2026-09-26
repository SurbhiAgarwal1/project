from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.repositories import AuditRepository

router = APIRouter()


@router.get("")
async def list_audit_logs(
    incident_id: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    repo = AuditRepository(db)
    logs = await repo.list_audit_logs(incident_id=incident_id, limit=limit)
    return [
        {
            "id": l.id,
            "incident_id": l.incident_id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "actor": l.actor,
            "action": l.action,
            "target": l.target,
            "risk": l.risk,
            "result": l.result
        }
        for l in logs
    ]

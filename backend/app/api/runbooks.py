from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.runbooks.catalog import get_runbook_catalog, get_runbook_by_id

router = APIRouter()


@router.get("")
def list_runbooks():
    catalog = get_runbook_catalog()
    return [
        {
            "id": rb.id,
            "name": rb.name,
            "service": rb.service,
            "description": rb.description,
            "namespace": rb.target_namespace,
            "step_count": len(rb.steps),
            "steps": [s.model_dump() for s in rb.steps]
        }
        for rb in catalog.values()
    ]


@router.get("/{runbook_id}")
def get_runbook(runbook_id: str):
    rb = get_runbook_by_id(runbook_id)
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return {
        "id": rb.id,
        "name": rb.name,
        "service": rb.service,
        "description": rb.description,
        "namespace": rb.target_namespace,
        "step_count": len(rb.steps),
        "steps": [s.model_dump() for s in rb.steps]
    }

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import yaml


class RunbookStep(BaseModel):
    id: str
    action: str
    risk: str = "READ_ONLY"  # READ_ONLY, LOW, MEDIUM, HIGH, CRITICAL
    requires_approval: bool = False
    description: Optional[str] = None
    on_success: Optional[str] = None
    on_failure: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class RunbookDefinition(BaseModel):
    id: str
    name: str
    service: str
    description: str
    target_namespace: str = "opsara-demo"
    steps: List[RunbookStep] = Field(default_factory=list)


def parse_runbook_yaml(content: str) -> RunbookDefinition:
    data = yaml.safe_load(content)
    steps = [RunbookStep(**s) for s in data.get("steps", [])]
    return RunbookDefinition(
        id=data.get("id", data.get("name", "runbook").lower().replace(" ", "-")),
        name=data.get("name", "Untitled Runbook"),
        service=data.get("service", "payment-api"),
        description=data.get("description", ""),
        target_namespace=data.get("namespace", "opsara-demo"),
        steps=steps
    )

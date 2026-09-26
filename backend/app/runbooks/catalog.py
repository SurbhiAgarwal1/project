import os
from typing import Dict, List, Optional
from app.runbooks.parser import RunbookDefinition, parse_runbook_yaml

_RUNBOOKS_CACHE: Dict[str, RunbookDefinition] = {}


def get_runbook_catalog() -> Dict[str, RunbookDefinition]:
    """Loads all runbooks from standard directory or built-in defaults."""
    global _RUNBOOKS_CACHE
    if _RUNBOOKS_CACHE:
        return _RUNBOOKS_CACHE

    catalog: Dict[str, RunbookDefinition] = {}

    # Paths to search
    search_dirs = [
        os.path.join(os.path.dirname(__file__), "../../../k8s/runbooks"),
        os.path.abspath("./k8s/runbooks"),
        os.path.abspath("../k8s/runbooks")
    ]

    for d in search_dirs:
        if os.path.exists(d):
            for fname in os.listdir(d):
                if fname.endswith(".yaml") or fname.endswith(".yml"):
                    fpath = os.path.join(d, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            rb = parse_runbook_yaml(f.read())
                            catalog[rb.id] = rb
                    except Exception as e:
                        print(f"Error loading runbook {fpath}: {e}")

    # Ensure built-ins exist
    if not catalog:
        default_rb = RunbookDefinition(
            id="payment-api-recovery",
            name="Payment API Recovery Runbook",
            service="payment-api",
            description="Operational runbook for diagnosing Payment API incidents",
            target_namespace="opsara-demo",
            steps=[]
        )
        catalog[default_rb.id] = default_rb

    _RUNBOOKS_CACHE = catalog
    return _RUNBOOKS_CACHE


def get_runbook_by_id(runbook_id: str) -> Optional[RunbookDefinition]:
    return get_runbook_catalog().get(runbook_id)

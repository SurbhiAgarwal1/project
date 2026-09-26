# Opsara Safety & Human-in-the-Loop Model

## 1. The Core Safety Tenet: Never Trust LLMs for Infrastructure Safety

Opsara enforces strict physical and architectural boundaries between the LLM reasoning agent and Kubernetes mutation APIs.

```text
       LLM
        ↓ (Produces structured intent proposal)
Backend Validation
        ↓ (Validates parameters, namespaces, targets)
Deterministic Risk Engine
        ↓ (Calculates risk: READ_ONLY | LOW | MEDIUM | HIGH | CRITICAL)
Human-in-the-Loop Gate
        ↓ (Pauses workflow; awaits human approval)
Human Operator Action
        ↓ (Explicit POST /api/approvals/{id}/approve)
Backend Execution Client
        ↓ (Executes typed Kubernetes API patch)
Independent Verification Engine
        ↓ (Confirms cluster recovery)
Resolution or Escalation
```

## 2. Idempotency & Action State Lifecycle

Every proposed remediation receives a unique `approval_id` and `action_id`.
Valid states:
- `PENDING`: Proposed by agent, awaiting operator review.
- `APPROVED`: Explicitly authorized by human operator.
- `EXECUTING`: Currently running against Kubernetes API.
- `SUCCEEDED`: Mutation completed successfully.
- `FAILED`: Mutation returned an API error.
- `REJECTED`: Rejected by operator; incident escalated.
- `EXPIRED`: Superseded or timed out.

Duplicate approval clicks or duplicate API calls will NEVER trigger repeated restarts or rollbacks.

## 3. Evidence Categories

The UI and database strictly distinguish:
- **OBSERVED**: Real, verified facts returned directly by Kubernetes API or HTTP probes.
- **INFERRED**: Hypotheses formulated by the agent connecting observed facts.
- **PROPOSED**: Prospective action submitted for safety evaluation.
- **EXECUTED**: Completed action with verified Kubernetes API response.
- **VERIFIED**: Post-remediation health check result.

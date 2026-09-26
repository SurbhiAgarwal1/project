# Opsara Hackathon Demo Guide

This guide details the three core demonstration scenarios for the **TrueFoundry "Agents That Act" Hackathon**.

---

## DEMO 1 — Successful OOM Remediation (Act Safely & Verify)

### Scenario Setup
Simulates an application pod being killed by the Linux cgroup memory subsystem due to memory exhaustion against its 128Mi container limit.

1. **Trigger Scenario**:
   In the Opsara Header, click `Simulate: OOM Crash` (or execute `POST /api/scenarios/trigger-oom`).
   Kubernetes terminates the pod with `OOMKilled`.

2. **Run Agent Investigation**:
   Click `New Incident` with:
   - Title: `Payment API OOM / CrashLoop detected`
   - Service: `payment-api`
   - Runbook: `OOM Recovery`
   Click `Create & Investigate`.

3. **Live Investigation**:
   Watch the agent investigate the cluster in real time via the SSE timeline:
   - `inspect_pods`: Detects `termination_reason: OOMKilled` and restart count increase.
   - `inspect_deployment`: Detects memory limit `128Mi` vs requests `64Mi`.
   - `get_kubernetes_events`: Finds kernel warning events.

4. **Hypothesis & Safe Proposal**:
   The agent synthesizes:
   - **Likely Cause**: Memory Exhaustion (`OOMKilled`)
   - **Confidence**: 95%
   - **Proposal**: `restart_deployment` (Rolling restart to clear heap buffer).
   - **Risk**: `MEDIUM`.

5. **Human-in-the-Loop Approval**:
   The workflow halts. The prominent **Approval Card** appears:
   - Shows Reason, Evidence bullets, Risk badge, and Expected Impact.
   - Click `Approve & Execute`.

6. **Execution & Verification**:
   - The backend mutation client triggers the Kubernetes rolling restart.
   - The verification engine checks:
     - `2/2` replicas ready
     - Pods in `Running` phase
     - Live `/health` probe returns `HTTP 200 OK`
   - Incident transitions to `RESOLVED`.

---

## DEMO 2 — Intelligent Escalation on Dependency Failure (Knowing When NOT to Act)

### Why this is critical:
A simplistic automated script blindly restarts pods whenever an incident occurs. In a database failure, restarting the application pod accomplishes nothing and risks compounding connection floods. Opsara proves genuine agentic reasoning by recognizing an external dependency failure and refusing to propose an unsafe restart.

1. **Trigger Scenario**:
   In the Header, click `Simulate: DB Failure` (or `POST /api/scenarios/trigger-db-failure`).
   `payment-api` logs report:
   `FATAL: connection refused to postgres://payment-db.internal:5432`
   and `/health` returns `HTTP 503`.

2. **Run Agent Investigation**:
   Create incident: `Payment API database connection failure`.
   Click `Start Investigation`.

3. **Live Investigation**:
   - `get_pod_logs`: Identifies fatal database connection refused.
   - `run_health_check`: Receives `HTTP 503` with database dependency error.

4. **Agentic Decision**:
   - **Likely Cause**: `Database Connectivity Failure`
   - **Agent Assessment**:
     > *"Application logs and health probe confirm database connection refused. Restarting payment-api will NOT resolve an unavailable external database. Halting mutation and escalating to Infrastructure/DBA team."*
   - **Result**: No mutation proposed. Incident safely transitioned to `ESCALATED`.

---

## DEMO 3 — Failed Deployment Rollout & Recovery

1. **Trigger Scenario**:
   Click `Simulate: Failed Rollout` (`POST /api/scenarios/trigger-rollout-failure`).
   Deployment template is patched with an invalid image tag.

2. **Investigation**:
   - `inspect_deployment`: Finds `0/2` available replicas.
   - `inspect_pods`: Detects `ImagePullBackOff` / `ErrImagePull`.

3. **Agent Action**:
   - Proposes `rollback_deployment` to previous healthy revision.
   - Gated with `HIGH RISK` approval request.
   - Once approved, executes rollback, verifies rollout completion, and confirms `RESOLVED`.

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    Float,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from app.database.connection import Base


def get_utc_now():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    service = Column(String(100), nullable=False)
    namespace = Column(String(100), nullable=False, default="opsara-demo")
    status = Column(String(50), nullable=False, default="OPEN")
    severity = Column(String(20), nullable=False, default="HIGH")
    runbook_id = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    hypothesis = Column(JSON, nullable=True)  # {summary, likely_cause, confidence, supporting_evidence}
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvent.timestamp")
    evidence = relationship("Evidence", back_populates="incident", cascade="all, delete-orphan")
    approvals = relationship("ApprovalRequest", back_populates="incident", cascade="all, delete-orphan")
    actions = relationship("ActionExecution", back_populates="incident", cascade="all, delete-orphan")
    verifications = relationship("VerificationResult", back_populates="incident", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="incident", cascade="all, delete-orphan")


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=get_utc_now)
    event_type = Column(String(50), nullable=False)  # INVESTIGATION, EVIDENCE, ANALYSIS, PROPOSAL, APPROVAL, EXECUTION, VERIFICATION, RESOLUTION
    description = Column(Text, nullable=False)
    event_metadata = Column(JSON, nullable=True)

    incident = relationship("Incident", back_populates="events")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False, default="OBSERVED")  # OBSERVED, INFERRED, PROPOSED, EXECUTED, VERIFIED
    source_tool = Column(String(100), nullable=False)
    observed_at = Column(DateTime, default=get_utc_now)
    summary = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False)  # Raw structured observation

    incident = relationship("Incident", back_populates="evidence")


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # restart_deployment, rollback_deployment, scale_deployment
    target = Column(String(100), nullable=False)
    namespace = Column(String(100), nullable=False)
    parameters = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, APPROVED, EXECUTING, SUCCEEDED, FAILED, REJECTED, EXPIRED
    expected_impact = Column(Text, nullable=True)
    rollback_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)

    incident = relationship("Incident", back_populates="approvals")
    action_execution = relationship("ActionExecution", back_populates="approval", uselist=False)


class ActionExecution(Base):
    __tablename__ = "action_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    approval_id = Column(String(36), ForeignKey("approval_requests.id"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)
    target = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, EXECUTING, SUCCEEDED, FAILED
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="actions")
    approval = relationship("ApprovalRequest", back_populates="action_execution")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False)  # PASSED, FAILED
    checks = Column(JSON, nullable=False)  # structured list of check details
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    incident = relationship("Incident", back_populates="verifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=get_utc_now)
    actor = Column(String(50), nullable=False)  # AGENT, USER, SYSTEM
    action = Column(String(100), nullable=False)
    target = Column(String(100), nullable=True)
    risk = Column(String(20), nullable=True)
    result = Column(JSON, nullable=True)

    incident = relationship("Incident", back_populates="audit_logs")


class Runbook(Base):
    __tablename__ = "runbooks"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    service = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    steps = Column(JSON, nullable=False)  # list of step definitions
    created_at = Column(DateTime, default=get_utc_now)

"""Audit log — records who accessed or changed what."""

import json
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

AUDIT_DB_URL = "sqlite:///output/audit.db"


class Base(DeclarativeBase):
    pass


class AuditEntry(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    actor = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)


_engine = None
_Session = None


def _get_session() -> Session:
    global _engine, _Session
    if _engine is None:
        _engine = create_engine(AUDIT_DB_URL)
        Base.metadata.create_all(_engine)
        _Session = sessionmaker(bind=_engine)
    return _Session()


def log_action(
    actor: str,
    action: str,
    resource: str,
    details: dict | None = None,
    ip_address: str | None = None,
    *,
    enabled: bool = True,
) -> None:
    """Record an audit log entry."""
    if not enabled:
        return
    session = _get_session()
    entry = AuditEntry(
        actor=actor,
        action=action,
        resource=resource,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
    )
    session.add(entry)
    session.commit()
    session.close()


def get_audit_log(limit: int = 100) -> list[dict]:
    """Retrieve recent audit log entries."""
    session = _get_session()
    entries = session.query(AuditEntry).order_by(AuditEntry.timestamp.desc()).limit(limit).all()
    session.close()
    return [
        {
            "timestamp": e.timestamp.isoformat(),
            "actor": e.actor,
            "action": e.action,
            "resource": e.resource,
            "details": json.loads(e.details) if e.details else None,
            "ip_address": e.ip_address,
        }
        for e in entries
    ]

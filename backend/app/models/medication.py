from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.db.time import utc_now


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    dose: Mapped[str] = mapped_column(String(200))
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    schedules: Mapped[List["MedicationSchedule"]] = relationship(back_populates="medication", order_by="MedicationSchedule.scheduled_time")
    logs: Mapped[List["MedicationLog"]] = relationship(back_populates="medication")


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), index=True)
    scheduled_time: Mapped[time] = mapped_column(Time)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    medication: Mapped[Medication] = relationship(back_populates="schedules")
    logs: Mapped[List["MedicationLog"]] = relationship(back_populates="schedule")


class MedicationLog(Base):
    __tablename__ = "medication_logs"
    __table_args__ = (
        UniqueConstraint("schedule_id", "scheduled_date", name="uq_schedule_day"),
        CheckConstraint("status IN ('pending', 'taken', 'skipped')"),
        CheckConstraint("(status = 'taken' AND taken_at IS NOT NULL) OR (status != 'taken' AND taken_at IS NULL)"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), index=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("medication_schedules.id"))
    scheduled_date: Mapped[date] = mapped_column(Date, index=True)  # Korean calendar date
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(10), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    medication: Mapped[Medication] = relationship(back_populates="logs")
    schedule: Mapped[MedicationSchedule] = relationship(back_populates="logs")

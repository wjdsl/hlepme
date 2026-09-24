from datetime import datetime

from sqlalchemy import and_, or_, select, update
from sqlalchemy.dialects.sqlite import insert

from app.db.time import KOREA, as_utc, utc_now
from app.models.medication import Medication, MedicationLog, MedicationSchedule


def list_medications(session, include_inactive=False):
    query = select(Medication).order_by(Medication.id.desc())
    if not include_inactive:
        query = query.where(Medication.is_active.is_(True))
    return session.scalars(query).all()


def set_times(medication, times):
    active = [schedule for schedule in medication.schedules if schedule.is_active]
    # Keep matching schedules; reuse remaining IDs so a time edit cannot create
    # a second occurrence of the same schedule on an already logged day.
    unmatched = [schedule for schedule in active if schedule.scheduled_time not in times]
    new_times = [value for value in times if value not in {s.scheduled_time for s in active}]
    for schedule, value in zip(unmatched, new_times):
        schedule.scheduled_time = value
    for schedule in unmatched[len(new_times):]:
        schedule.is_active = False
    for value in new_times[len(unmatched):]:
        medication.schedules.append(MedicationSchedule(scheduled_time=value))


def save_medication(session, payload, medication=None):
    values = payload.model_dump(exclude_unset=True)
    times = values.pop("scheduled_times", None)
    if medication is None:
        medication = Medication(**values)
        session.add(medication)
    else:
        for key, value in values.items():
            setattr(medication, key, value)
        medication.updated_at = utc_now()
    if times is not None:
        set_times(medication, times)
    session.commit()
    session.refresh(medication)
    return medication


def today_logs(session):
    now = utc_now()
    day = as_utc(now).astimezone(KOREA).date()
    schedules = session.scalars(select(MedicationSchedule).join(Medication).where(
        Medication.is_active.is_(True), MedicationSchedule.is_active.is_(True)
    )).all()
    for schedule in schedules:
        scheduled_at = as_utc(datetime.combine(day, schedule.scheduled_time, KOREA)).replace(tzinfo=None)
        session.execute(insert(MedicationLog).values(
            medication_id=schedule.medication_id, schedule_id=schedule.id,
            scheduled_date=day, scheduled_at=scheduled_at, status="pending", created_at=now,
        ).on_conflict_do_nothing(index_elements=["schedule_id", "scheduled_date"]))
        # Time edits affect pending occurrences only; completed history is fixed.
        session.execute(update(MedicationLog).where(
            MedicationLog.schedule_id == schedule.id, MedicationLog.scheduled_date == day,
            MedicationLog.status == "pending",
        ).values(scheduled_at=scheduled_at))
    session.commit()
    return session.scalars(select(MedicationLog).join(Medication).join(
        MedicationSchedule, MedicationLog.schedule_id == MedicationSchedule.id
    ).where(MedicationLog.scheduled_date == day, or_(
        MedicationLog.status != "pending",
        and_(Medication.is_active.is_(True), MedicationSchedule.is_active.is_(True)),
    )).order_by(MedicationLog.scheduled_at, MedicationLog.id)).all()


def record_status(session, log, status):
    # Repeated take requests preserve the first actual time, including retries.
    session.execute(update(MedicationLog).where(
        MedicationLog.id == log.id, MedicationLog.status != status,
    ).values(status=status, taken_at=utc_now() if status == "taken" else None))
    session.commit()
    session.refresh(log)
    return log

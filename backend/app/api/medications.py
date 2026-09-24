from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models.medication import Medication, MedicationLog, MedicationSchedule
from app.repositories import medications
from app.schemas.medication import MedicationCreate, MedicationPatch, MedicationRead, ScheduleRead, ScheduleWrite, LogRead

router = APIRouter(prefix="/api", tags=["medications"])


def require(session, model, identifier):
    value = session.get(model, identifier)
    if value is None:
        raise HTTPException(404, "복약 정보를 찾을 수 없습니다.")
    return value


def check_schedule(session, medication, time, exclude_id=None):
    if not medication.is_active:
        raise HTTPException(409, "복용 중단한 약의 일정은 변경할 수 없습니다.")
    duplicate = session.scalar(select(MedicationSchedule).where(
        MedicationSchedule.medication_id == medication.id,
        MedicationSchedule.is_active.is_(True), MedicationSchedule.scheduled_time == time,
        MedicationSchedule.id != exclude_id if exclude_id is not None else True,
    ))
    if duplicate:
        raise HTTPException(409, "같은 시간의 복용 일정이 있습니다.")


@router.get("/medications", response_model=List[MedicationRead])
def list_medications(include_inactive: bool = False, session: Session = Depends(get_session)):
    return medications.list_medications(session, include_inactive)


@router.post("/medications", response_model=MedicationRead, status_code=201)
def create_medication(payload: MedicationCreate, session: Session = Depends(get_session)):
    return medications.save_medication(session, payload)


@router.get("/medications/{medication_id}", response_model=MedicationRead)
def get_medication(medication_id: int, session: Session = Depends(get_session)):
    return require(session, Medication, medication_id)


@router.patch("/medications/{medication_id}", response_model=MedicationRead)
def update_medication(medication_id: int, payload: MedicationPatch, session: Session = Depends(get_session)):
    return medications.save_medication(session, payload, require(session, Medication, medication_id))


@router.post("/medications/{medication_id}/schedules", response_model=ScheduleRead, status_code=201)
def create_schedule(medication_id: int, payload: ScheduleWrite, session: Session = Depends(get_session)):
    medication = require(session, Medication, medication_id)
    check_schedule(session, medication, payload.scheduled_time)
    schedule = MedicationSchedule(medication=medication, scheduled_time=payload.scheduled_time)
    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@router.patch("/medication-schedules/{schedule_id}", response_model=ScheduleRead)
def update_schedule(schedule_id: int, payload: ScheduleWrite, session: Session = Depends(get_session)):
    schedule = require(session, MedicationSchedule, schedule_id)
    if not schedule.is_active:
        raise HTTPException(404, "삭제된 일정입니다.")
    check_schedule(session, schedule.medication, payload.scheduled_time, schedule.id)
    schedule.scheduled_time = payload.scheduled_time
    session.commit()
    session.refresh(schedule)
    return schedule


@router.delete("/medication-schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, session: Session = Depends(get_session)):
    schedule = require(session, MedicationSchedule, schedule_id)
    schedule.is_active = False  # Preserve log foreign keys and historical times.
    session.commit()
    return Response(status_code=204)


@router.get("/medication-logs/today", response_model=List[LogRead])
def today_logs(session: Session = Depends(get_session)):
    return medications.today_logs(session)


def change_status(session, log_id, status):
    log = require(session, MedicationLog, log_id)
    if not log.medication.is_active or not log.schedule.is_active:
        raise HTTPException(409, "중단한 약 또는 삭제된 일정입니다.")
    return medications.record_status(session, log, status)


@router.patch("/medication-logs/{log_id}/take", response_model=LogRead)
def take(log_id: int, session: Session = Depends(get_session)):
    return change_status(session, log_id, "taken")


@router.patch("/medication-logs/{log_id}/skip", response_model=LogRead)
def skip(log_id: int, session: Session = Depends(get_session)):
    return change_status(session, log_id, "skipped")

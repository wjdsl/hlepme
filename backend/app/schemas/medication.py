from datetime import datetime, time
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.db.time import as_utc


class WriteModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ScheduleWrite(WriteModel):
    scheduled_time: time

    @field_validator("scheduled_time")
    @classmethod
    def local_minutes(cls, value):
        if value.tzinfo is not None or value.second or value.microsecond:
            raise ValueError("한국 시간의 시:분(HH:MM)을 입력해 주세요.")
        return value


class MedicationCreate(WriteModel):
    name: str = Field(min_length=1, max_length=200)
    dose: str = Field(min_length=1, max_length=200)
    instructions: Optional[str] = Field(default=None, max_length=2000)
    scheduled_times: List[time] = Field(default_factory=list, max_length=24)

    @field_validator("name", "dose")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("이름과 복용량을 입력해 주세요.")
        return value.strip()

    @field_validator("scheduled_times")
    @classmethod
    def valid_times(cls, values):
        for value in values:
            ScheduleWrite.local_minutes(value)
        if len(set(values)) != len(values):
            raise ValueError("복용 시간이 중복됩니다.")
        return sorted(values)


class MedicationPatch(MedicationCreate):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    dose: Optional[str] = Field(default=None, min_length=1, max_length=200)
    scheduled_times: Optional[List[time]] = Field(default=None, max_length=24)
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def reject_null(cls, data):
        if isinstance(data, dict) and any(key in data and data[key] is None for key in ("name", "dose", "scheduled_times", "is_active")):
            raise ValueError("필수 항목은 null일 수 없습니다.")
        return data


class ReadModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("created_at", "updated_at", "scheduled_at", "taken_at", check_fields=False)
    @classmethod
    def utc_dates(cls, value):
        return as_utc(value) if value is not None else None


class ScheduleRead(ReadModel):
    id: int
    medication_id: int
    scheduled_time: time
    is_active: bool
    created_at: datetime


class MedicationRead(ReadModel):
    id: int
    name: str
    dose: str
    instructions: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    schedules: List[ScheduleRead]

    @field_validator("schedules")
    @classmethod
    def active_schedules(cls, values):
        return [value for value in values if value.is_active]


class LogRead(ReadModel):
    id: int
    medication_id: int
    schedule_id: int
    scheduled_at: datetime
    taken_at: Optional[datetime]
    status: Literal["pending", "taken", "skipped"]
    created_at: datetime
    medication: MedicationRead

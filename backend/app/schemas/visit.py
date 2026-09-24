from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.time import as_utc


class VisitFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("scheduled_at", check_fields=False)
    @classmethod
    def aware_time(cls, value):
        if value is None or value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("시간대가 포함된 예정 시각을 입력해 주세요.")
        return as_utc(value).replace(tzinfo=None)

    @field_validator("title", check_fields=False)
    @classmethod
    def nonblank_title(cls, value):
        if value is None or not value.strip():
            raise ValueError("진료 제목을 입력해 주세요.")
        return value.strip()


class VisitCreate(VisitFields):
    scheduled_at: datetime
    title: str = Field(default="병원 진료", max_length=200)
    memo: Optional[str] = None


class VisitPatch(VisitFields):
    scheduled_at: Optional[datetime] = None
    title: Optional[str] = Field(default=None, max_length=200)
    memo: Optional[str] = None


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scheduled_at: datetime
    title: str
    memo: Optional[str]
    created_at: datetime
    updated_at: datetime

    @field_validator("scheduled_at", "created_at", "updated_at")
    @classmethod
    def include_timezone(cls, value):
        return as_utc(value)

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, field_validator


class PostWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str

    @field_validator("content")
    @classmethod
    def reject_blank(cls, value):
        if not value.strip():
            raise ValueError("본문을 입력해 주세요.")
        return value


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def include_utc_timezone(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

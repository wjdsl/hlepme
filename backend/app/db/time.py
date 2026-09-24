"""SQLite timestamps are naive UTC at rest and timezone-aware UTC in APIs."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

KOREA = ZoneInfo("Asia/Seoul")


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

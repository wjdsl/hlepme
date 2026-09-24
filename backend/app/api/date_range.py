"""Inclusive Korean calendar dates, translated to half-open UTC bounds."""
from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import HTTPException

from app.db.time import KOREA, as_utc


def date_range(start_date: Optional[date] = None, end_date: Optional[date] = None):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422, "시작 날짜는 종료 날짜보다 늦을 수 없습니다.")
    try:
        start = as_utc(datetime.combine(start_date, time.min, KOREA)).replace(tzinfo=None) if start_date else None
        end = as_utc(datetime.combine(end_date + timedelta(days=1), time.min, KOREA)).replace(tzinfo=None) if end_date else None
    except (OverflowError, ValueError):
        raise HTTPException(422, "지원하지 않는 날짜 범위입니다.")
    return start, end


def filter_dates(query, column, bounds):
    start, end = bounds
    if start is not None:
        query = query.where(column >= start)
    if end is not None:
        query = query.where(column < end)
    return query

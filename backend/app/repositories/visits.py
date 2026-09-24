from sqlalchemy import select

from app.api.date_range import filter_dates
from app.db.time import utc_now
from app.models.visit import Visit


def list_visits(session, bounds=(None, None)):
    query = filter_dates(select(Visit), Visit.scheduled_at, bounds)
    return session.scalars(query.order_by(Visit.scheduled_at, Visit.id)).all()


def save_visit(session, payload, visit=None):
    values = payload.model_dump(exclude_unset=True)
    if visit is None:
        now = utc_now()
        visit = Visit(**values, created_at=now, updated_at=now)
        session.add(visit)
    else:
        for key, value in values.items():
            setattr(visit, key, value)
        visit.updated_at = utc_now()
    session.commit()
    session.refresh(visit)
    return visit


def delete_visit(session, visit):
    session.delete(visit)
    session.commit()

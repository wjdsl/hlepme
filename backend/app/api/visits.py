from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.date_range import date_range
from app.db.session import get_session
from app.models.visit import Visit
from app.repositories import visits
from app.schemas.visit import VisitCreate, VisitPatch, VisitRead

router = APIRouter(prefix="/api/visits", tags=["visits"])


def require_visit(session, visit_id):
    visit = session.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(404, "진료 일정을 찾을 수 없습니다.")
    return visit


@router.post("", response_model=VisitRead, status_code=201)
def create_visit(payload: VisitCreate, session: Session = Depends(get_session)):
    return visits.save_visit(session, payload)


@router.get("", response_model=List[VisitRead])
def list_visits(bounds=Depends(date_range), session: Session = Depends(get_session)):
    return visits.list_visits(session, bounds)


@router.get("/{visit_id}", response_model=VisitRead)
def get_visit(visit_id: int, session: Session = Depends(get_session)):
    return require_visit(session, visit_id)


@router.patch("/{visit_id}", response_model=VisitRead)
def update_visit(visit_id: int, payload: VisitPatch, session: Session = Depends(get_session)):
    return visits.save_visit(session, payload, require_visit(session, visit_id))


@router.delete("/{visit_id}", status_code=204)
def delete_visit(visit_id: int, session: Session = Depends(get_session)):
    visits.delete_visit(session, require_visit(session, visit_id))
    return Response(status_code=204)

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.date_range import date_range
from app.db.session import get_session
from app.repositories import posts
from app.schemas.post import PostRead, PostWrite

router = APIRouter(prefix="/api/posts", tags=["posts"])


def require_post(session, post_id):
    post = posts.get_post(session, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
    return post


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostWrite, session: Session = Depends(get_session)):
    return posts.create_post(session, payload.content)


@router.get("", response_model=List[PostRead])
def list_posts(bounds=Depends(date_range), session: Session = Depends(get_session)):
    return posts.list_posts(session, bounds)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, session: Session = Depends(get_session)):
    return require_post(session, post_id)


@router.patch("/{post_id}", response_model=PostRead)
def update_post(post_id: int, payload: PostWrite, session: Session = Depends(get_session)):
    return posts.update_post(session, require_post(session, post_id), payload.content)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, session: Session = Depends(get_session)):
    posts.delete_post(session, require_post(session, post_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from app.api.date_range import filter_dates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.post import Post, utc_now


def list_posts(session: Session, bounds=(None, None)):
    query = filter_dates(select(Post), Post.created_at, bounds)
    return session.scalars(query.order_by(Post.created_at.desc(), Post.id.desc())).all()


def get_post(session: Session, post_id: int):
    return session.get(Post, post_id)


def create_post(session: Session, content: str):
    now = utc_now()
    post = Post(content=content, created_at=now, updated_at=now)
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


def update_post(session: Session, post: Post, content: str):
    post.content = content
    post.updated_at = utc_now()
    session.commit()
    session.refresh(post)
    return post


def delete_post(session: Session, post: Post):
    session.delete(post)
    session.commit()

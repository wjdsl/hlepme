import os
from pathlib import Path

from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def make_engine(database_url=None):
    default_path = Path(__file__).resolve().parents[2] / "posts.db"
    url = database_url or os.getenv("DATABASE_URL", f"sqlite:///{default_path}")
    return create_engine(url, connect_args={"check_same_thread": False})


def get_session(request: Request):
    with Session(request.app.state.engine) as session:
        yield session

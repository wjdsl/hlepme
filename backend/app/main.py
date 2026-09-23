from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.posts import router
from app.db.session import Base, make_engine


def create_app(database_url=None):
    @asynccontextmanager
    async def lifespan(app):
        engine = make_engine(database_url)
        app.state.engine = engine
        Base.metadata.create_all(engine)
        try:
            yield
        finally:
            engine.dispose()

    application = FastAPI(title="혼잣말", version="0.1.0", lifespan=lifespan)
    application.include_router(router)
    return application


app = create_app()

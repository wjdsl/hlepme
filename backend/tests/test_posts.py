from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.main import create_app
from app.models.post import Post
from fastapi.testclient import TestClient


def test_create_and_get(client):
    content = "  오늘은 조금 느리게.\n산책하고 싶다.  "
    response = client.post("/api/posts", json={"content": content})
    assert response.status_code == 201
    post = response.json()
    assert set(post) == {"id", "content", "created_at", "updated_at"}
    assert post["content"] == content
    assert post["created_at"] == post["updated_at"]
    assert datetime.fromisoformat(post["created_at"].replace("Z", "+00:00")).utcoffset().total_seconds() == 0
    assert client.get(f"/api/posts/{post['id']}").json() == post


def test_list_latest_first_with_tie_break(client):
    assert client.get("/api/posts").json() == []
    ids = [client.post("/api/posts", json={"content": str(i)}).json()["id"] for i in range(3)]
    assert [p["id"] for p in client.get("/api/posts").json()] == ids[::-1]
    with Session(client.app.state.engine) as session:
        for post in session.query(Post).all():
            post.created_at = datetime(2026, 1, 1)
        session.commit()
    assert [p["id"] for p in client.get("/api/posts").json()] == ids[::-1]


def test_update_and_delete(client):
    post = client.post("/api/posts", json={"content": "처음"}).json()
    url = f"/api/posts/{post['id']}"
    response = client.patch(url, json={"content": "수정"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["content"] == "수정"
    assert updated["created_at"] == post["created_at"]
    assert updated["updated_at"] > post["updated_at"]
    assert client.get(url).json() == updated
    response = client.delete(url)
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(url).status_code == 404
    assert client.get("/api/posts").json() == []


@pytest.mark.parametrize("payload", [{}, {"content": ""}, {"content": " \n\t"}, {"content": None}, {"content": 12}, {"content": "글", "tag": "태그"}])
def test_invalid_content_does_not_mutate(client, payload):
    post = client.post("/api/posts", json={"content": "원본"}).json()
    assert client.post("/api/posts", json=payload).status_code == 422
    assert client.patch(f"/api/posts/{post['id']}", json=payload).status_code == 422
    assert client.get("/api/posts").json() == [post]


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_missing_post(client, method):
    kwargs = {"json": {"content": "내용"}} if method == "patch" else {}
    assert getattr(client, method)("/api/posts/999", **kwargs).status_code == 404


def test_data_survives_restart(tmp_path):
    url = f"sqlite:///{tmp_path / 'persistent.db'}"
    with TestClient(create_app(url)) as first:
        post = first.post("/api/posts", json={"content": "남아 있는 기록"}).json()
    with TestClient(create_app(url)) as second:
        assert second.get("/api/posts").json() == [post]

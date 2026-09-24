from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import create_app
from app.models.post import Post


def test_visit_crud(client):
    assert client.get('/api/visits').json() == []
    response = client.post('/api/visits', json={'scheduled_at': '2026-10-08T09:30:00+09:00'})
    assert response.status_code == 201
    visit = response.json()
    assert visit['title'] == '병원 진료'
    assert visit['memo'] is None
    assert visit['scheduled_at'] == '2026-10-08T00:30:00Z'
    assert visit['created_at'] == visit['updated_at']
    url = f"/api/visits/{visit['id']}"
    assert client.get(url).json() == visit
    assert client.get('/api/visits').json() == [visit]
    updated = client.patch(url, json={'title': '정기 진료', 'memo': '질문 메모', 'scheduled_at': '2026-10-09T15:00:00+09:00'}).json()
    assert updated['scheduled_at'] == '2026-10-09T06:00:00Z'
    assert updated['title'] == '정기 진료'
    assert updated['memo'] == '질문 메모'
    assert updated['created_at'] == visit['created_at']
    assert updated['updated_at'] > visit['updated_at']
    cleared = client.patch(url, json={'memo': None}).json()
    assert cleared['memo'] is None and cleared['title'] == '정기 진료'
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert client.get('/api/visits').json() == []


@pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
def test_missing_visit(client, method):
    kwargs = {'json': {'title': '진료'}} if method == 'patch' else {}
    assert getattr(client, method)('/api/visits/999', **kwargs).status_code == 404


@pytest.mark.parametrize('payload', [
    {'scheduled_at': '2026-09-24T10:00:00'}, {'scheduled_at': None},
    {'scheduled_at': 'invalid'}, {'title': ''}, {'title': '  '},
    {'title': None}, {'title': '가' * 201}, {'unknown': 'value'},
])
def test_invalid_visit_does_not_mutate(client, payload):
    good = {'scheduled_at': '2026-09-24T10:00:00+09:00'}
    original = client.post('/api/visits', json=good).json()
    assert client.post('/api/visits', json={**good, **payload}).status_code == 422
    assert client.patch(f"/api/visits/{original['id']}", json=payload).status_code == 422
    assert client.get('/api/visits').json() == [original]


def test_post_and_visit_same_day_and_seoul_boundaries(client):
    # Seoul Sep 24 is UTC Sep 23 15:00 <= time < Sep 24 15:00.
    times = ['2026-09-23T14:59:59.999999', '2026-09-23T15:00:00',
             '2026-09-24T14:59:59.999999', '2026-09-24T15:00:00']
    with Session(client.app.state.engine) as session:
        for i, value in enumerate(times):
            session.add(Post(content=str(i), created_at=datetime.fromisoformat(value)))
        session.commit()
    visits = [client.post('/api/visits', json={'scheduled_at': value + 'Z', 'title': str(i)}).json() for i, value in enumerate(times)]
    params = {'start_date': '2026-09-24', 'end_date': '2026-09-24'}
    assert [p['content'] for p in client.get('/api/posts', params=params).json()] == ['2', '1']
    assert client.get('/api/visits', params=params).json() == visits[1:3]
    assert len(client.get('/api/posts').json()) == 4
    assert len(client.get('/api/visits', params={'start_date': '2026-09-24'}).json()) == 3
    assert len(client.get('/api/visits', params={'end_date': '2026-09-24'}).json()) == 3
    # Viewing/editing a post never changes its calendar date or duplicates it.
    post = client.get('/api/posts', params=params).json()[0]
    client.patch(f"/api/posts/{post['id']}", json={'content': '수정'})
    assert client.get(f"/api/posts/{post['id']}").json()['created_at'] == post['created_at']
    client.delete(f"/api/posts/{post['id']}")
    assert len(client.get('/api/posts', params=params).json()) == 1
    assert client.get('/api/visits', params=params).json() == visits[1:3]


@pytest.mark.parametrize('path', ['/api/posts', '/api/visits'])
@pytest.mark.parametrize('params', [
    {'start_date': '2026-10-01', 'end_date': '2026-09-01'},
    {'start_date': 'invalid'}, {'end_date': '2026-02-30'},
    {'end_date': '9999-12-31'}, {'start_date': '0001-01-01'},
])
def test_invalid_ranges(client, path, params):
    assert client.get(path, params=params).status_code == 422


def test_month_year_and_leap_boundaries(client):
    for value in ['2024-02-29T23:59:59+09:00', '2024-03-01T00:00:00+09:00',
                  '2026-12-31T23:59:59+09:00', '2027-01-01T00:00:00+09:00']:
        assert client.post('/api/visits', json={'scheduled_at': value}).status_code == 201
    for start, end in [('2024-02-01', '2024-02-29'), ('2026-12-01', '2026-12-31')]:
        assert len(client.get('/api/visits', params={'start_date': start, 'end_date': end}).json()) == 1


def test_additive_schema_preserves_v02_data_and_restart(tmp_path):
    from app.db.session import Base, make_engine
    from app.models.medication import Medication, MedicationSchedule, MedicationLog
    from sqlalchemy import inspect

    url = f"sqlite:///{tmp_path / 'upgrade.db'}"
    engine = make_engine(url)
    # Create only V0.2 tables, then populate them through the V0.2 repositories.
    Base.metadata.create_all(engine, tables=[Post.__table__, Medication.__table__, MedicationSchedule.__table__, MedicationLog.__table__])
    from app.repositories.medications import save_medication, today_logs, record_status
    from app.schemas.medication import MedicationCreate
    with Session(engine) as session:
        session.add(Post(content='기존 개인 기록', created_at=datetime(2026, 9, 23, 15)))
        save_medication(session, MedicationCreate(name='기존 약', dose='1정', scheduled_times=['09:00']))
        log = today_logs(session)[0]
        record_status(session, log, 'taken')
    tables = ['posts', 'medications', 'medication_schedules', 'medication_logs']
    def snapshot():
        with engine.connect() as connection:
            return {table: connection.exec_driver_sql(f'SELECT * FROM {table} ORDER BY id').fetchall() for table in tables}
    before = snapshot()
    assert 'visits' not in inspect(engine).get_table_names()
    with TestClient(create_app(url)) as client:
        assert snapshot() == before
        visit = client.post('/api/visits', json={'scheduled_at': '2026-10-08T10:00:00+09:00'}).json()
        assert client.get('/api/posts').json()[0]['content'] == '기존 개인 기록'
        assert client.get('/api/medications').json()[0]['name'] == '기존 약'
    with TestClient(create_app(url)) as client:
        assert client.get('/api/visits').json() == [visit]
        assert snapshot() == before
    engine.dispose()

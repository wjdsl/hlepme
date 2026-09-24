from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.medication import MedicationLog
from app.repositories import medications


def create(client, times=None):
    response = client.post('/api/medications', json={
        'name': '테스트 약', 'dose': '10mg', 'instructions': '식후',
        'scheduled_times': times if times is not None else ['08:00'],
    })
    assert response.status_code == 201
    return response.json()


def today(client):
    response = client.get('/api/medication-logs/today')
    assert response.status_code == 200
    return response.json()


def test_create_and_get(client):
    med = create(client)
    assert med['name'] == '테스트 약'
    assert med['is_active'] is True
    assert med['created_at'].endswith('Z')
    assert client.get(f"/api/medications/{med['id']}").json() == med


def test_list(client):
    assert client.get('/api/medications').json() == []
    med = create(client)
    assert client.get('/api/medications').json() == [med]


def test_update(client):
    med = create(client)
    updated = client.patch(f"/api/medications/{med['id']}", json={'dose': '20mg', 'instructions': None}).json()
    assert updated['dose'] == '20mg'
    assert updated['instructions'] is None
    assert updated['updated_at'] >= med['updated_at']


def test_deactivate(client):
    med = create(client)
    assert client.patch(f"/api/medications/{med['id']}", json={'is_active': False}).json()['is_active'] is False
    assert client.get('/api/medications').json() == []
    assert len(client.get('/api/medications?include_inactive=true').json()) == 1
    assert today(client) == []


def test_schedule_crud(client):
    med = create(client, [])
    response = client.post(f"/api/medications/{med['id']}/schedules", json={'scheduled_time': '20:00'})
    assert response.status_code == 201
    sid = response.json()['id']
    assert client.patch(f'/api/medication-schedules/{sid}', json={'scheduled_time': '21:00'}).json()['scheduled_time'] == '21:00:00'
    assert client.delete(f'/api/medication-schedules/{sid}').status_code == 204
    assert today(client) == []
    assert client.get(f"/api/medications/{med['id']}").json()['schedules'] == []


def test_today_and_timezone(client, monkeypatch):
    monkeypatch.setattr(medications, 'utc_now', lambda: datetime(2026, 9, 23, 16))
    create(client, ['08:00', '20:00'])
    logs = today(client)
    assert len(logs) == 2
    assert logs[0]['scheduled_at'] == '2026-09-23T23:00:00Z'  # Sep 24, 08:00 KST
    assert logs[1]['scheduled_at'] == '2026-09-24T11:00:00Z'
    assert all(log['status'] == 'pending' and log['taken_at'] is None for log in logs)


def test_no_duplicate_logs(client):
    create(client)
    first = today(client)
    assert today(client) == first
    with Session(client.app.state.engine) as session:
        assert session.scalar(select(func.count()).select_from(MedicationLog)) == 1
        original = session.get(MedicationLog, first[0]['id'])
        session.add(MedicationLog(medication_id=original.medication_id, schedule_id=original.schedule_id,
                                  scheduled_date=original.scheduled_date, scheduled_at=original.scheduled_at))
        with pytest.raises(IntegrityError):
            session.commit()


def test_concurrent_today(client):
    create(client)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: today(client), range(8)))
    assert len({logs[0]['id'] for logs in results}) == 1


def test_take_actual_time_and_retry(client):
    create(client)
    log = today(client)[0]
    before = datetime.now(timezone.utc)
    response = client.patch(f"/api/medication-logs/{log['id']}/take")
    assert response.status_code == 200
    taken = response.json()
    assert taken['status'] == 'taken'
    assert before <= datetime.fromisoformat(taken['taken_at'].replace('Z', '+00:00')) <= datetime.now(timezone.utc)
    assert today(client)[0]['taken_at'] == taken['taken_at']
    assert client.patch(f"/api/medication-logs/{log['id']}/take").json()['taken_at'] == taken['taken_at']


def test_skip_and_correct_taken(client):
    create(client)
    log = today(client)[0]
    url = f"/api/medication-logs/{log['id']}"
    skipped = client.patch(url + '/skip').json()
    assert skipped['status'] == 'skipped' and skipped['taken_at'] is None
    client.patch(url + '/take')
    assert client.patch(url + '/skip').json()['taken_at'] is None
    assert today(client)[0]['status'] == 'skipped'


def test_deactivation_preserves_history_and_prevents_future(client, monkeypatch):
    monkeypatch.setattr(medications, 'utc_now', lambda: datetime(2026, 9, 23, 0))
    med = create(client)
    log = today(client)[0]
    client.patch(f"/api/medication-logs/{log['id']}/take")
    client.patch(f"/api/medications/{med['id']}", json={'is_active': False})
    assert today(client)[0]['status'] == 'taken'
    monkeypatch.setattr(medications, 'utc_now', lambda: datetime(2026, 9, 24, 0))
    assert today(client) == []
    with Session(client.app.state.engine) as session:
        assert session.get(MedicationLog, log['id']).status == 'taken'
        assert session.scalar(select(func.count()).select_from(MedicationLog)) == 1


def test_deactivation_hides_pending_preserves_row(client):
    med = create(client)
    log = today(client)[0]
    client.patch(f"/api/medications/{med['id']}", json={'is_active': False})
    assert today(client) == []
    assert client.patch(f"/api/medication-logs/{log['id']}/take").status_code == 409
    with Session(client.app.state.engine) as session:
        assert session.get(MedicationLog, log['id']) is not None


def test_time_edit_updates_pending_but_preserves_completed(client):
    med = create(client)
    log = today(client)[0]
    client.patch(f"/api/medications/{med['id']}", json={'scheduled_times': ['09:00']})
    changed = today(client)[0]
    assert changed['id'] == log['id']
    assert changed['scheduled_at'] != log['scheduled_at']
    client.patch(f"/api/medication-logs/{log['id']}/take")
    client.patch(f"/api/medications/{med['id']}", json={'scheduled_times': ['10:00']})
    assert today(client)[0]['scheduled_at'] == changed['scheduled_at']


def test_delete_schedule_keeps_log(client):
    create(client)
    log = today(client)[0]
    assert client.delete(f"/api/medication-schedules/{log['schedule_id']}").status_code == 204
    assert today(client) == []
    with Session(client.app.state.engine) as session:
        assert session.get(MedicationLog, log['id']).schedule is not None


def test_new_day_generates_new_occurrence(client, monkeypatch):
    monkeypatch.setattr(medications, 'utc_now', lambda: datetime(2026, 9, 23, 14, 59))
    create(client)
    first = today(client)[0]
    monkeypatch.setattr(medications, 'utc_now', lambda: datetime(2026, 9, 23, 15))
    assert today(client)[0]['id'] != first['id']


@pytest.mark.parametrize('payload', [
    {'name': ''}, {'name': ' '}, {'dose': None}, {'is_active': None},
    {'scheduled_times': None}, {'scheduled_times': ['25:00']},
    {'scheduled_times': ['08:00', '08:00']}, {'scheduled_times': ['08:00:01']},
    {'scheduled_times': ['08:00+09:00']}, {'unexpected': True},
])
def test_invalid_patch(client, payload):
    med = create(client)
    assert client.patch(f"/api/medications/{med['id']}", json=payload).status_code == 422


@pytest.mark.parametrize('path', ['/medications/999', '/medication-schedules/999', '/medication-logs/999/take', '/medication-logs/999/skip'])
def test_missing_resources(client, path):
    payload = {'scheduled_time': '08:00'} if 'schedules' in path else {}
    assert client.patch('/api' + path, json=payload).status_code == 404


def test_duplicate_schedule_rejected(client):
    med = create(client)
    assert client.post(f"/api/medications/{med['id']}/schedules", json={'scheduled_time': '08:00'}).status_code == 409


def test_logs_survive_app_restart(tmp_path):
    from fastapi.testclient import TestClient
    from app.main import create_app

    url = f"sqlite:///{tmp_path / 'restart.db'}"
    with TestClient(create_app(url)) as first:
        create(first)
        log = today(first)[0]
        taken = first.patch(f"/api/medication-logs/{log['id']}/take").json()
    with TestClient(create_app(url)) as restarted:
        assert today(restarted)[0]['taken_at'] == taken['taken_at']
        assert today(restarted)[0]['id'] == log['id']

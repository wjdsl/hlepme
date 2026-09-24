# 혼잣말 · V0.2

생각나는 말을 바로 적는 개인용 기록 앱입니다. 감정 점수, 태그, 카테고리 없이 **본문 하나만** 입력합니다.

혼잣말 작성·조회·수정·삭제와 최신순 타임라인에 복약 관리를 추가했습니다. 약 등록·수정·복용 중단, 매일 여러 복용 시간, 오늘의 복용 완료·건너뜀 기록을 지원합니다. 실제 알림, LLM/AI 요약, 병원 방문 관리, 로그인/회원가입, HealthKit 연동, 클라우드 배포는 포함하지 않습니다.

## 기술 및 구조

- Backend: Python 3.9+, FastAPI, SQLAlchemy 2, SQLite, Pydantic 2, pytest
- Frontend: React 19, Vite 7, CSS 반응형 UI. Node.js 22.12+ 사용 권장(검증 환경: 24.18).

```text
backend/
├── app/
│   ├── main.py              # 앱 생성, lifespan에서 테이블 생성 및 연결 정리
│   ├── api/posts.py         # HTTP 라우팅과 404 처리
│   ├── models/post.py       # SQLAlchemy 모델
│   ├── schemas/post.py      # 본문 검증, 응답 스키마와 UTC 시각
│   ├── repositories/posts.py # DB 조회 및 변경
│   └── db/session.py        # SQLite 엔진과 요청별 세션
├── tests/
│   ├── conftest.py          # 테스트별 임시 SQLite DB
│   └── test_posts.py
├── pytest.ini
└── requirements.txt
frontend/
├── src/
│   ├── App.jsx             # 작성창과 타임라인 상태
│   ├── api.js              # API 호출
│   ├── components/PostCard.jsx # 기록 표시, 수정 및 삭제
│   ├── main.jsx
│   └── styles.css
├── index.html
├── vite.config.js          # /api를 backend로 프록시
├── package.json
└── package-lock.json
```

단순 CRUD이므로 서비스 계층은 두지 않았습니다. 추후 복약·진료 준비 등 비즈니스 로직이 생길 때 서비스 모듈을 추가할 수 있습니다.

## 실행

프로젝트 루트에서 별도 터미널 두 개를 사용합니다.

### 1. Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API 문서: <http://127.0.0.1:8000/docs>
- V0.1에서 V0.2로 코드를 갱신했다면 기존 backend를 종료한 뒤 위 명령으로 다시 실행합니다.
  `--reload` 없이 실행 중인 서버는 파일이 바뀌어도 이전 API를 계속 제공합니다.
  `/openapi.json`의 `info.version`이 `0.2.0`이고 `/api/medications` 및
  `/api/medication-logs/today`가 있는지 확인하세요. Post는 되지만 복약 GET/POST가
  `404 {"detail":"Not Found"}`이면 먼저 실제 실행 서버의 버전을 확인합니다.
  이 경우 DB 삭제·초기화나 프론트엔드 URL 변경은 필요하지 않습니다.
- 첫 실행 시 `backend/posts.db`에 테이블을 생성합니다. 실행 디렉터리가 달라도 기본 DB 파일 위치는 같습니다.
- 다른 SQLite 파일을 쓰려면 실행 전에 `DATABASE_URL=sqlite:////절대/경로/records.db`를 설정합니다. 상위 폴더는 미리 생성해야 합니다.
- 기록은 SQLite 파일에 보관되며 새로고침 및 서버 재시작 후에도 유지됩니다. DB 파일은 Git 제외 대상입니다.

### 2. Frontend

```sh
cd frontend
npm ci
npm run dev
```

터미널에 표시되는 주소(기본 <http://localhost:5173>)를 엽니다. Vite가 `/api` 요청을 `http://127.0.0.1:8000`으로 전달하므로 별도 CORS 설정이 필요 없습니다.

화면은 작은 모바일 폭에도 맞춰집니다. 실제 휴대폰으로 확인하려면 같은 신뢰하는 로컬 네트워크에서 `npm run dev -- --host 0.0.0.0`으로 실행하고 PC의 LAN IP와 Vite 포트로 접속합니다. 인증이 없는 개인용 개발 버전이므로 기본 설정은 로컬 접속용입니다.

## 검증

```sh
cd backend
.venv/bin/python -m pytest -q
```

테스트는 테스트별 임시 DB를 사용하고 실제 `posts.db`를 변경하지 않습니다. CRUD, 최신순과 동일 시각 정렬, 빈 본문 및 잘못된 요청 거부, 404, UTC 시각, 수정 시 작성 시각 유지, 앱 재시작 후 영속성을 검증합니다.

```sh
cd frontend
npm run build
npm run preview
```

빌드 결과는 `frontend/dist/`에 생성됩니다. `preview`는 빌드 확인용이며 API 사용에는 backend도 실행되어 있어야 합니다.

## Post API

| 메서드 | 경로 | 동작 | 성공 응답 |
| --- | --- | --- | --- |
| POST | `/api/posts` | 작성 | 201 + Post |
| GET | `/api/posts` | 전체 조회 | 200 + Post 배열 |
| GET | `/api/posts/{id}` | 단일 조회 | 200 + Post |
| PATCH | `/api/posts/{id}` | 본문 수정 | 200 + Post |
| DELETE | `/api/posts/{id}` | 삭제 | 204, 본문 없음 |

작성·수정 요청:

```json
{ "content": "오늘은 잠깐 산책하고 싶다." }
```

Post 응답 예시:

```json
{
  "id": 1,
  "content": "오늘은 잠깐 산책하고 싶다.",
  "created_at": "2026-09-23T07:00:00Z",
  "updated_at": "2026-09-23T07:00:00Z"
}
```

- 본문은 문자열이며 빈 문자열과 공백만 있는 입력은 422로 거부합니다. 줄바꿈과 입력한 앞뒤 공백은 보존합니다. 추가 필드는 거부합니다.
- `id`와 시각은 서버에서 생성합니다. 시각은 DB에 UTC로 저장하고 API에서 시간대 정보를 포함합니다. 화면에는 한국 시간(Asia/Seoul)으로 표시합니다.
- 전체 조회는 `created_at DESC, id DESC`입니다. 수정해도 작성 시각과 표시 순서는 바뀌지 않습니다.
- 없는 기록 조회·수정·삭제는 404입니다.
- 저장 실패 시 입력을 유지하며 재시도할 수 있습니다. 로딩·빈 목록·연결 오류를 구분해 표시합니다.

## 다음 단계에서 고려할 점

V0.1은 전체 목록을 한 번에 조회하고 시작 시 `create_all`로 테이블을 만듭니다. 이후 기록량이 늘면 페이지네이션, 모델 변경이 생기면 DB 마이그레이션을 도입하면 됩니다. `create_all`은 기존 테이블 구조를 변경하지 않습니다.

참고 문서: [FastAPI 테스트](https://fastapi.tiangolo.com/tutorial/testing/), [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/quickstart.html), [Vite](https://vite.dev/guide/).


## V0.2 복약 관리

`Medication` 1:N `MedicationSchedule`, `Medication` 1:N `MedicationLog`,
`MedicationSchedule` 1:N `MedicationLog` 관계를 SQLAlchemy relationship으로 연결합니다.
기존 Post 테이블을 변경하지 않고 시작 시 새 테이블만 생성하므로 기존 DB를 그대로 사용할 수 있습니다.

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET / POST | `/api/medications` | 활성 약 목록 / 약과 일정 함께 생성 |
| GET / PATCH | `/api/medications/{id}` | 약 조회 / 부분 수정·복용 중단 |
| POST | `/api/medications/{id}/schedules` | 매일 복용 시간 추가 |
| PATCH / DELETE | `/api/medication-schedules/{id}` | 시간 수정 / 일정 비활성화 |
| GET | `/api/medication-logs/today` | 한국 날짜 기준 오늘 기록 생성·조회 |
| PATCH | `/api/medication-logs/{id}/take` | 복용 완료와 서버의 실제 시각 기록 |
| PATCH | `/api/medication-logs/{id}/skip` | 건너뜀, taken_at=null |

약 생성 예시: `{"name":"예시 약","dose":"10mg","instructions":"식후","scheduled_times":["08:00","20:00"]}`.
PATCH에서는 변경할 필드만 전송합니다. `scheduled_times`는 활성 시간 전체를 한 트랜잭션에서 갱신합니다.
`is_active=false`로 중단하며 `GET /api/medications?include_inactive=true`로 중단 약도 조회합니다.
시간은 한국의 HH:MM이며 초·시간대 접미사·중복 시간을 거부합니다. Swagger에서 medications 태그로 구분합니다.

- 날짜/시간: DB의 timestamp는 기존 Post와 동일한 UTC naive 형식으로만 저장하고 API는 UTC `Z`를 포함합니다.
  하루의 기준은 Asia/Seoul이고 `scheduled_date`는 한국 달력 날짜입니다. UI 표시도 한국 시간입니다.
- 오늘 조회 시 활성 약·일정의 log를 생성합니다. `(schedule_id, scheduled_date)` UNIQUE와 SQLite
  ON CONFLICT DO NOTHING으로 동시 조회에서도 중복을 방지합니다. 시간이 지나도 pending입니다.
- 복용 완료를 재요청해도 최초 taken_at은 유지합니다. 건너뜀으로 정정하면 taken_at을 비웁니다.
- 시간 변경은 오늘 pending에 반영하며 taken/skipped의 scheduled_at은 유지합니다.
  기존 시간에 대응하는 schedule ID를 최대한 유지하고 추가 시간은 별도 일정으로 만듭니다.
- 약 중단/일정 삭제는 soft delete입니다. 오늘 미완료 항목은 숨기고 완료·건너뜀은 계속 표시하며
  모든 기존 log를 DB에 보존합니다. 과거 약 이름·용량은 현재 Medication을 참조합니다.
- 백그라운드 작업은 없습니다. 조회하지 않은 과거 날짜의 pending 기록을 소급 생성하지 않습니다.
  화면 복귀 시와 한국 날짜가 바뀔 때 오늘 목록을 다시 가져옵니다.
- 개인정보: 실제 DB·SQLite sidecar·백업·.env·키 파일은 기존 .gitignore에서 제외합니다.
  pytest는 tmp_path DB만 사용하며 브라우저 검증도 별도 임시 DB에서 가상 데이터만 사용합니다.

별도 실행: `.venv/bin/python -m pytest tests/test_posts.py -q` 및
`.venv/bin/python -m pytest tests/test_medications.py -q` (backend 디렉터리).
전체 테스트는 `.venv/bin/python -m pytest -q`, 프런트 빌드는 `npm run build`입니다.

향후에는 Alembic 마이그레이션, 과거 복약 이력 화면과 이름·용량 스냅샷, 일정 변경의 적용일,
알림 권한·재예약 정책을 검토할 수 있습니다.

중복 삽입 구현 참고: [SQLAlchemy SQLite ON CONFLICT](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html#insert-on-conflict-upsert).

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

## V0.3 기록 달력과 진료 일정

나의 기록에서 **타임라인 / 달력**을 전환합니다. 본문만 작성하는 Post 입력은 그대로입니다.
달력은 서울 날짜 기준으로 작성 건수와 진료 여부를 함께 표시합니다. 이전/다음 달, 오늘 이동,
날짜 선택을 지원하며 선택한 날짜의 Post는 작성 시간순으로 표시하고 기존 수정·삭제를 제공합니다.
`+ 진료 일정`은 선택한 날짜와 기본 제목 `병원 진료`로 시작합니다. 날짜·시간·제목과 선택 메모를
저장하면 달력에 즉시 반영되며 수정·삭제할 수 있습니다. 알림과 AI/LLM 호출은 없습니다.

### API

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| POST | `/api/visits` | 진료 생성, 201 |
| GET | `/api/visits` | 전체 또는 날짜 범위 조회, 예정 시각·id 오름차순 |
| GET | `/api/visits/{id}` | 단일 조회 |
| PATCH | `/api/visits/{id}` | 전달한 필드만 수정 |
| DELETE | `/api/visits/{id}` | 삭제, 204 |
| GET | `/api/posts?start_date=2026-09-24&end_date=2026-09-24` | 기존 Post의 서울 날짜별 조회 |

Visit 생성 예시:

```json
{
  "scheduled_at": "2026-10-08T09:30:00+09:00",
  "title": "병원 진료",
  "memo": "진료 때 물어볼 내용"
}
```

- `title` 생략 시 `병원 진료`, 공백 제목은 422, 최대 200자입니다. `memo`는 생략·null 허용이며
  PATCH에 `memo: null`을 보내면 지워집니다. `scheduled_at`과 `title`의 명시적 null은 거부합니다.
- 예정 시각은 timezone을 포함해야 합니다. UTC `Z` 또는 `+09:00` 등을 허용하고 DB에는 UTC로
  정규화해 저장합니다. 응답의 세 timestamp는 UTC `Z`를 포함합니다. 없는 id는 404입니다.
- Post와 Visit의 목록은 선택적으로 `start_date`, `end_date` (`YYYY-MM-DD`)를 받습니다.
  **시작일과 종료일 모두 포함**하며 하나만 주면 반대쪽은 제한하지 않습니다. 역전 범위·잘못된 날짜는 422입니다.
  예를 들어 서울 9월 24일은 UTC `[9월 23일 15:00, 9월 24일 15:00)`로 조회합니다.
- Post의 기준은 `created_at`, Visit의 기준은 `scheduled_at`입니다. Post 수정으로 작성일은 바뀌지 않습니다.
  쿼리가 없는 Post 목록은 기존의 최신순입니다. 달력 날짜별 목록만 화면에서 시간순으로 정렬합니다.
- 현재 달력은 기존 전체 Post 목록과 Visit 전체 목록으로 집계합니다. 날짜별 Post 복사본이나
  달력 전용 영속 데이터는 생성하지 않습니다. 데이터가 커지면 추가한 기간 API로 조회 범위를 줄일 수 있습니다.

### 데이터 보존과 향후 브리핑

기존 `posts`, `medications`, `medication_schedules`, `medication_logs` 테이블을 변경하지 않습니다.
앱 시작 시 기존 `Base.metadata.create_all`이 누락된 `visits` 테이블과 `scheduled_at` 인덱스만
추가합니다. 데이터 초기화·DROP·기존 행 재작성은 없습니다. 실행 중인 개발 서버가 자동 재시작되면
그 시점에 테이블이 추가됩니다. 별도 수동 DB 초기화는 필요하지 않습니다.

`visits`: `id` PK, `scheduled_at` NOT NULL/INDEX, `title` NOT NULL, `memo` NULL 허용,
`created_at` NOT NULL, `updated_at` NOT NULL. 세 시각 모두 기존 테이블과 같은 UTC naive 저장 규칙입니다.

향후 진료 브리핑에서는 대상 Visit보다 `scheduled_at`이 앞선 직전 Visit을 구한 뒤,
`previous.scheduled_at < Post.created_at <= target.scheduled_at` 같은 명시적인 구간으로 조회할 수 있습니다.
날짜 전체를 포함하려면 이번에 추가한 서울 날짜 경계 규칙을 사용합니다. MedicationLog는
`scheduled_date`(서울 달력 날짜), `scheduled_at`(UTC 예정 시각), `taken_at`(UTC 실제 복용 시각)을
이미 분리해 저장하므로 예정 기준/실제 복용 기준을 구분해 조회할 수 있습니다.
이번 버전은 브리핑 API, 과거 복약 기간 API, 요약 또는 LLM 호출을 추가하지 않습니다.

### 테스트 재현

- Backend: `cd backend` 후 `.venv/bin/python -m pytest tests -q` (모든 테스트가 pytest 임시 DB 사용).
- Production build: `cd frontend` 후 `npm run build`.
- 브라우저 자동화: `frontend/tests/browser-v03.cjs`. Chrome과 Playwright가 설치되어 있어야 합니다.
  **새로운 빈 임시 DB**로 API 서버를 8013 포트에 실행하고 preview 프록시를 해당 서버로 연결합니다.
  개인 DB를 사용하는 기본 8000 서버로 이 테스트를 실행하지 마세요.

```sh
# backend 디렉터리: mktemp로 매번 새 디렉터리를 만듭니다.
V03_TEST_DIR=$(mktemp -d /tmp/honjatmal-v03-XXXXXX)
DATABASE_URL="sqlite:///$V03_TEST_DIR/browser.db" .venv/bin/uvicorn app.main:app --port 8013

# 다른 터미널, frontend 디렉터리
API_PROXY_TARGET=http://127.0.0.1:8013 npm run preview -- --host 127.0.0.1 --port 4173 --strictPort

# 프로젝트 루트에서 Playwright 설치 위치를 NODE_PATH에 지정한 환경으로 실행
V03_TEST_BASE_URL=http://127.0.0.1:4173 V03_ISOLATED_DB=1 node frontend/tests/browser-v03.cjs
```

브라우저 테스트는 미국 시간대에서 서울 날짜 표시를 검증하며 desktop 및 390px 스크린샷과
결과 JSON을 `V03_ARTIFACT_DIR` (기본 `/private/tmp/honjatmal-v03-browser`)에 저장합니다.
전체 시나리오를 재실행할 때에는 새로운 빈 테스트 DB로 서버를 다시 시작합니다.

기간 쿼리 검증 참고: [FastAPI Query Parameters](https://fastapi.tiangolo.com/tutorial/query-params-str-validations/).

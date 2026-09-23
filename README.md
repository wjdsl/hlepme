# 혼잣말 · V0.1

생각나는 말을 바로 적는 개인용 기록 앱입니다. 감정 점수, 태그, 카테고리 없이 **본문 하나만** 입력합니다.

이번 버전에는 혼잣말 작성·조회·수정·삭제와 최신순 타임라인만 포함합니다. LLM/AI 요약, 복약 관리 및 알림, 병원 방문 관리, 로그인/회원가입, 클라우드 배포는 구현하지 않았습니다.

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
- `id`와 시각은 서버에서 생성합니다. 시각은 DB에 UTC로 저장하고 API에서 시간대 정보를 포함합니다. 화면에는 기기 현지 시간으로 표시합니다.
- 전체 조회는 `created_at DESC, id DESC`입니다. 수정해도 작성 시각과 표시 순서는 바뀌지 않습니다.
- 없는 기록 조회·수정·삭제는 404입니다.
- 저장 실패 시 입력을 유지하며 재시도할 수 있습니다. 로딩·빈 목록·연결 오류를 구분해 표시합니다.

## 다음 단계에서 고려할 점

V0.1은 전체 목록을 한 번에 조회하고 시작 시 `create_all`로 테이블을 만듭니다. 이후 기록량이 늘면 페이지네이션, 모델 변경이 생기면 DB 마이그레이션을 도입하면 됩니다. `create_all`은 기존 테이블 구조를 변경하지 않습니다.

참고 문서: [FastAPI 테스트](https://fastapi.tiangolo.com/tutorial/testing/), [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/quickstart.html), [Vite](https://vite.dev/guide/).

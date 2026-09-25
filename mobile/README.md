# HelpMe Mobile V0.4A

React Native + Expo SDK 57의 **기록 화면만** 구현한 독립 앱입니다. Gemini 코드는 시각적 참고만 했으며 HTML, Tailwind, 기존 웹 코드는 사용하지 않았습니다. 달력·복용약·수정·삭제는 이번 범위에 포함하지 않습니다.

## iPhone + Expo Go 실행

Node.js 24 LTS 권장. 터미널에서:

```sh
cd /Users/jeungeun/Desktop/helpme/mobile
npm ci
npm start
```

1. iPhone에 SDK 57을 지원하는 최신 Expo Go를 설치합니다: https://expo.dev/go
2. Mac과 iPhone을 같은 Wi-Fi에 연결합니다.
3. SDK 57의 실제 iPhone 연결을 위해 Expo CLI(`npx expo login`)와 Expo Go에 같은 Expo 계정으로 로그인합니다.
4. 터미널 QR 코드를 iPhone 카메라로 스캔하고 Expo Go에서 엽니다.
5. 연결이 막히면 LAN/로컬 네트워크 권한을 확인합니다. 필요하면 `npx expo start --go --tunnel`을 사용합니다(터널 도구 추가 설치 필요).

FastAPI 실행, backend 환경 변수, API URL, Xcode 빌드가 필요하지 않습니다. 개발 번들을 받는 Metro 연결과 기록 데이터 저장은 별개입니다.

## 저장 방식

- `expo-sqlite` 기본 documents 디렉터리의 `helpme-records.db`에 저장합니다.
- SQLite INSERT 완료 후 화면을 갱신하고 입력을 비웁니다. 연속 탭을 막고, 실패하면 입력을 유지합니다.
- 앱 시작 시 같은 파일을 열어 모든 기록을 불러옵니다. 샘플 기록이나 시작 시 초기화/삭제는 없습니다.
- 생성 시각, 당시 기기의 로컬 날짜·시간을 저장합니다. 날짜별 그룹과 최신순 목록, 오늘/어제 표시를 제공합니다.
- 서버 호출, 동기화, 분석 SDK는 없습니다. Expo Go 삭제/앱 데이터 삭제는 로컬 DB도 삭제할 수 있습니다. 프로젝트 slug는 유지하세요.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform ios
npx expo-doctor
```

자동 테스트는 실제 SQLite 파일을 Node SQLite 어댑터로 열어 저장 후 닫기/재개방/스키마 재실행, 한글·줄바꿈·따옴표, 정렬, 공백 거부, 연도 경계 날짜, 저장 오류 전달을 검증합니다. Expo 네이티브 브리지 및 실제 iPhone UI 검증을 대신하지 않습니다.

### iPhone 인수 테스트 (실기기 확인 필요)

- 처음 열었을 때 빈 상태가 표시되고 공백만 입력하면 기록 버튼이 비활성화되는지 확인합니다.
- 한글, 이모지, 줄바꿈으로 기록 2개를 저장하고 오늘 그룹/시간/최신순을 확인합니다.
- 저장 완료 후 Expo Go를 앱 전환기에서 완전히 종료합니다.
- 같은 프로젝트를 다시 열어 두 기록이 그대로 남아 있는지 확인합니다.
- 백엔드를 실행하지 않은 상태에서도 추가 저장되는지 확인합니다.
- 키보드가 열린 상태에서 저장 버튼과 긴 입력 내용이 보이는지, 긴 목록 스크롤과 큰 글자 설정을 확인합니다.

공식 참고: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/

## 2026-09-24: Expo 시작 무출력 현상 복구

진단 환경: Node 24.18.0 / npm 11.16.0, Expo 57.0.24 / CLI 57.0.26,
React Native 0.86.3 / React 19.2.3 / expo-sqlite 57.0.3.
npm registry는 기본 https://registry.npmjs.org/ 이며 NODE_OPTIONS 별도 설정은 없었습니다.

실제 사용자 프로세스와 진단 프로세스 모두 Metro 시작 전 Node의 동기 파일 읽기
(`ReadFileUtf8 → uv_fs_read → read`)에 머물렀습니다. 기존 node_modules 내 작은 JS 파일을
읽는 데 8~38초가 걸렸습니다. Desktop에 File Provider 속성이 있고 디렉터리 이동도
지연됐으므로 파일 공급자/파일 시스템 지연이 의심됩니다. 특정 서비스가 원인이라는
확정 진단은 아닙니다. 네트워크 대기나 SQLite 코드가 멈춘 상태는 아니었습니다.

동일 package-lock.json으로 /tmp에서 의존성 설치(705개, 6초) 후 mobile/node_modules를
새 설치본으로 교체했습니다. package.json, lockfile의 버전, 앱 코드, DB 스키마는 변경하지
않았습니다. 기존 지연 의존성 폴더는 제거했습니다. 시스템 설정이나 iCloud 설정은 변경하지 않았습니다.

복구 후 `npx expo start`로 Metro 시작 메시지, QR 코드, Expo Go LAN 주소 출력을 확인했고,
`/status`에서 `packager-status:running`, iOS manifest HTTP 정상 응답을 확인했습니다.
타입 검사, 린트, SQLite 테스트 3개도 통과했습니다.

현재는 재설치 없이 아래 명령을 실행하면 됩니다.

```sh
cd /Users/jeungeun/Desktop/helpme/mobile
npx expo start
```

같은 파일 읽기 지연이 재발하면 서버를 Ctrl+C로 종료 후 `npm ci`로 lockfile 버전을 재설치합니다.
`--clear`는 Metro 변환 캐시를 지우는 옵션이므로 CLI 파일 읽기 지연 자체를 해결하지 않습니다.
Desktop 파일 공급자 지연이 계속된다면 프로젝트를 동기화되지 않는 로컬 개발 폴더로
옮기는 것을 고려하세요. Expo slug와 SQLite 파일 이름을 바꾸지 마세요.

# GTO Pocket — 오프라인 프리플랍 레인지 앱

8인 MTT 프리플랍 GTO 혼합 빈도를 빠르게 보는 설치형 웹 앱(PWA)입니다. 원본 데이터는 Poker Practice의 공개 `MTT_{100,40,20,10,5}_GTO.json`에서 최초 동기화하며, 다섯 스택을 기기에 저장한 후에는 오프라인 조회할 수 있습니다.

## 기능
- 8인 MTT 포지션: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB
- 스택: 100BB, 40BB, 20BB, 10BB, 5BB
- 상황: 오픈, 오픈 대응(3벳/콜), 3벳 대응(4벳/콜), 4벳 대응(5벳/콜), 5벳 대응(콜)
- 내 포지션은 4칸씩 2줄 버튼으로 선택
- 멀티웨이 상황 구성: 최초 레이즈 포지션, 내 포지션, 앞선 콜러들을 지정하고 액션 순서를 확인
- 13×13 핸드 그리드와 핸드별 액션 빈도
- 올인/레이즈/콜/폴드 색상 키, 최초 데이터 동기화 버튼은 화면 하단
- 첫 실행 후 전체 데이터 동기화, IndexedDB 로컬 저장, 서비스 워커의 앱 셸 캐시

## Android에서 설치하는 가장 쉬운 방법

앱 설치와 서비스 워커는 HTTPS 주소에서 사용해야 합니다. ZIP 안의 파일을 HTTPS 정적 호스팅(GitHub Pages 등)에 올려 주세요.

### GitHub Pages 예시
1. GitHub에서 새 공개 저장소를 만듭니다. 예: `gto-pocket`.
2. ZIP의 압축을 풀고 **폴더 안의 파일 전부**를 저장소 최상위(root)에 업로드합니다. `index.html`, `app.js`, `sw.js`, `styles.css`, `manifest.webmanifest`, `icons/`가 최상위에 있어야 합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. 현재 저장소는 GitHub Actions를 통해 배포하도록 설정했다면 `Settings → Pages → Source: GitHub Actions`를 선택합니다. Branch 배포를 쓰는 경우에는 `main`과 `/(root)`를 선택합니다. 두 방식의 설정은 함께 사용하지 않습니다.
5. 배포된 HTTPS 주소를 Android Chrome으로 엽니다.
6. 화면 하단 **오프라인 데이터 → 모든 스택 데이터 저장**을 누릅니다. 완료 문구가 나올 때까지 페이지를 닫지 않습니다.
7. Chrome 메뉴에서 **앱 설치** 또는 **홈 화면에 추가**를 선택합니다.
8. 설치한 앱을 연 뒤 비행기 모드에서도 레인지 표가 열리는지 확인합니다.

## 참고 / 제한
- 최초 데이터 다운로드에는 인터넷이 필요합니다. 한 번 저장하면 데이터 조회에는 네트워크가 필요하지 않습니다.
- 스택 선택지는 원본 데이터가 실제 제공하는 100·40·20·10·5BB만 포함합니다.
- 원본 MTT JSON은 액션 빈도(레이즈/콜)를 저장하지만 모든 노드의 베팅 사이즈를 별도 필드로 제공하지 않습니다. UI는 올인 진한 빨강, 일반 레이즈 빨강, 콜 초록, 폴드 하늘색으로 구분합니다. 5BB에서는 레이즈 범주를 올인 범주로 표시하지만, 그 외 스택에서는 개별 노드의 올인과 비올인 레이즈를 확실하게 분리할 수 없는 한 레이즈 빨강으로 표시합니다.
- 멀티웨이 설정: `앞선 콜 있음`을 누르고 처음 레이즈한 포지션을 선택한 뒤, 내 포지션을 4×2 버튼에서 선택합니다. 이후 내 차례 전에 콜한 포지션(예: CO 콜)을 체크하면 액션 순서가 표시됩니다. 콜러는 여러 명 선택할 수 있습니다. 원본 데이터에는 앞선 콜까지 조건으로 넣은 별도 멀티웨이 솔버 노드가 없으므로, 실제 GTO 빈도를 임의로 만들지 않고 데이터 부재를 안내합니다.
- 짧은 스택에서 원본 데이터에 존재하지 않는 노드는 빈 차트를 만들어내지 않고 “차트 없음”으로 표시합니다.
- 앱은 원본 JSON의 이전 액션 빈도로 나누는 조건부 빈도 변환을 적용해, 해당 의사결정 지점에 도달했을 때의 빈도를 표시합니다.
- 브라우저가 원본 `raw.githubusercontent.com` 데이터에 최초 접근할 수 있어야 합니다. 이 개발 환경에서는 외부 네트워크가 차단되어 실제 기기에서 최초 동기화가 되는지까지 실행 검증하지 못했습니다. 배포 후 첫 동기화를 확인하고, 실패하면 브라우저 콘솔의 CORS/네트워크 오류를 점검해야 합니다.

## 데이터 출처 및 라이선스
- Source repository: https://github.com/jensbaagaard/poker-practice
- Data README: https://raw.githubusercontent.com/jensbaagaard/poker-practice/main/data/openSourcePokerData/README.md
- Poker Practice repository states that the source range data is MIT-licensed and free to use. Keep source attribution when redistributing.

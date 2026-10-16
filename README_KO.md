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
# GTO Pocket 로컬 솔버 연동 결과

## 실제 결과
- 저장소 `dahoonman1/gto-porket`의 main을 `outputs/gto-porket`에 복제하고 로컬 수정했다. 원격 push·배포는 하지 않았다.
- 프리플랍 디렉터리 5,875개 항목에서 고유 노드 5,875개를 추출했다. 누락 라우팅·충돌·미해독 노드는 0개다.
- 983,119개 저장 핸드 행. 200개 노드는 169핸드 미만이며 총 9,756개 핸드 행이 미저장이다. 액션 EV가 없는 행은 1,205개다. 누락을 보간하거나 폴드로 치환하지 않았다.
- NCB2 전치 고정 길이 및 NCB1 비전치 가변 길이 행을 해독했다. NCB1의 EV 유무 플래그는 행 오프셋 52의 bit 1로 추론했으며 모든 길이·경계·확률 검사와 일치했다. 구현 소스 확인은 아니다.
- 확률합 최대 오차 4.470348358154297e-8. 루트 확률·액션 EV의 스냅샷 대비 최대 절대 오차 2.644401781992656e-7.

## 검증 범위와 한계
- 원본 SQLite는 mode=ro 및 query_only=ON으로 열었다. 프리플랍 디렉터리와 history/street/player 인덱스, node_id 블록 인덱스만 조회했다. 전체 포스트플랍 스캔은 하지 않았다.
- 조사 전후 원본 SQLite 관련 파일의 크기·수정 시각 동일. 전체 원본 해시·DB integrity_check는 수행하지 않았다.
- 전체성은 디렉터리에서 접근 가능한 프리플랍 노드 기준이다. 디렉터리에 등록되지 않은 고아 노드의 부재는 확인하지 않았다.
- 169핸드 매핑은 이전 작업의 캐시와 1,326조합 구조 일치 추론을 사용했다. 이번에 확인한 nlhe_solver_artifacts/runtime 아래에는 검증 가능한 솔버 구현 소스가 없었다. 카드 번호·조합 인덱스 정의를 구현과 직접 대조하지 못했다.
- 루트 player=3, fold 후 player=4 등의 좌석 이동은 데이터에서 확인했지만 BTN/SB/BB 이름은 확정하지 않았다. request.json의 button은 null이다. UI는 원본 좌석 번호를 사용한다.
- 이 solve는 8인 20BB, BB ante 1BB, multiway_experimental, bucket_only이며 5,000,000회 요청 중 1,034,384회에서 중단되었다. 복원 성공·정규화된 확률은 수렴이나 GTO 충실도를 보증하지 않는다.
- 컨테이너 내부 미확인 체크섬 필드는 검증하지 않았다. 출력 노드별 SHA-256은 생성·재검증하며 UI도 불러올 때 확인한다.

## 변경 파일
- index.html: 로컬 솔버 화면으로 이동 링크 추가.
- solver.html, solver.js: 13×13 핸드 표시, 실제 액션별 빈도와 존재하는 EV, 다인 이력·이전 상황 이동·다음 액션 조회·직접 노드 선택, 미저장 핸드 표시, 전체 오프라인 저장.
- sw.js: 셸 버전과 새 화면·목록 캐시 추가. 전체 노드 저장은 별도 버튼으로 수행하며 브라우저 용량 제한 시 오류를 표시한다.
- data/manifest.json: import 계약 gto_pocket_preflop_v1, 추론·검증 상태, 설정, 노드 목록·해시.
- data/<node_id>.json: 고유 노드 5,875개. ID는 문자열, 핸드는 라벨로 연결, 전략·EV 배열은 actions 순서와 일치. 없는 EV는 null.
- data/export-report.json: 원본 보존·라우팅 조회 결과.
- tools/export_preflop.py, decode_preflop.cjs, validate.cjs: 스트리밍 추출·해독·전체 출력 검증.
- tools/bucket_mapping_candidates.json, root_strategy_buckets.json: 이전 작업의 매핑 후보 및 루트 비교 기준.
- README_KO.md: 실행·재생성·검증 한계 안내 추가.

## 실행과 검사
Python 3으로 저장소 폴더에서 `python -m http.server 8765`를 실행한 뒤 http://localhost:8765/solver.html 을 연다. 일반 파일 더블클릭 방식은 지원하지 않는다.
Node 24 이상 필요:
1. `python tools/export_preflop.py SOURCE OUTSIDE_SOURCE/preflop.jsonl`
2. `node tools/decode_preflop.cjs OUTSIDE_SOURCE/preflop.jsonl tools/bucket_mapping_candidates.json tools/root_strategy_buckets.json data`
3. `node tools/validate.cjs data`

전체 5,875개 출력 파일을 다시 읽어 해시·고유 ID·핸드 커버리지·확률합·매핑·행 수를 검사했다. Edge 브라우저 자동 검사에서 169셀, AKs 상세, fold 후 좌석 4 이동, 셸 및 방문한 루트의 오프라인 재로드를 확인했고 페이지 오류는 없었다. 전체 데이터 저장 버튼의 5,875개 다운로드와 실제 휴대폰 설치는 아직 실행 검증하지 않았다.

## v0.4: v3 화면에 액션 이력 통합
기존 스택/상황/포지션/핸드표를 유지하고 여섯 번째 메뉴를 '앞선 액션'으로 확장했다. 포지션·행동·레이즈 총액을 순서대로 추가하고 이력을 눌러 수정할 수 있다. 생략된 차례는 폴드로 처리하며 '전체 이력'에서 확인한다. 스택을 바꾸면 다른 스택의 이력이 남지 않도록 초기화한다.
20BB 로컬 데이터는 핸드/포지션 매핑이 미검증이므로 해당 이력의 차트를 확정 GTO로 표시하지 않는다. 기존 공개 데이터와 추출 파일·기존 솔버 URL은 보존했다. 앱의 기본 진입점은 index.html이다.
검사: `node tools/test-history.cjs`. PC/모바일 및 오프라인 동작은 Edge에서 검사했다. 기존 공개 차트의 브라우저 검사는 합성 fixture를 사용했으므로 원격 데이터 다운로드나 GTO 충실도 검증과 구분한다.

## v0.5: 20BB 실제 데이터 연결 / 상대 버튼으로 빠른 선택
내 포지션을 고르면 상대 7명 중 한 명을 눌러 바로 행동을 선택한다. 읽는 법 섹션은 제거했다. 20BB는 BB 앤티 1BB를 반영하며 실제 저장 경로가 존재할 때만 표시한다. 캐시 기반 핸드 매핑은 구조 검사를 통과한 추론이며 소스 대조·수렴 검증과 구분한다. 5,875개 이력의 좌석/팟/콜 금액은 모두 재생 일치한다. 검증 보고서: data/mapping-validation.json. 전체 오프라인 저장은 별도 '20BB 멀티액션 데이터 저장' 버튼을 사용한다.
검사: `node tools/test-all-histories.cjs`, `node tools/validate.cjs data`. 추출 파일은 보존했으며, 트리에 없는 다인 액션 경로는 데이터 없음으로 표시한다.

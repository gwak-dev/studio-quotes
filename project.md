# Studio Quotes 웹 견적 계산기 프로젝트

## 1. 프로젝트 개요
녹음실 구축/출장 녹음에 필요한 장비를 **체크박스**로 선택하여
• 최저/평균/최고 견적 합계
• 동시 입력 채널 수
• 드럼 마이킹 포함 여부
• 선택 리스트 & 용도 요약
을 실시간으로 보여주는 정적 웹 애플리케이션입니다.

## 2. 기술 스택
| 영역 | 사용 기술 |
|------|-----------|
| UI   | HTML5, TailwindCSS, 다크모드(tailwind `dark` 클래스) |
| UX   | JavaScript(ES6) – 단일 `script.js`로 로직 관리 |
| 호스팅 | GitHub + Vercel (정적 배포) |

## 3. 폴더 구조
```
studio-quotes/
├── index.html      # 메인 페이지 (Tailwind CDN + 외부 CSS/JS)
├── style.css       # 추가 사용자 지정 스타일
├── script.js       # 데이터 · 견적 계산 로직
├── .gitignore      # 노드·시크릿 제외
├── .vercelignore   # 배포 제외 목록
├── vercel.json     # 정적 사이트 설정
└── project.md      # 📄 현재 문서
```

## 4. 개발/로컬 실행
```bash
# 1) 레포 클론
git clone https://github.com/gwak-dev/studio-quotes.git
cd studio-quotes

# 2) 브라우저로 열기 (macOS)
open index.html
#   또는 VSCode Live Server / nginx 등 아무거나 OK
```
Tailwind는 CDN으로 불러오므로 **추가 빌드 과정이 필요 없습니다**.

## 5. 장비 데이터 수정 방법
1. `script.js` 상단의 `const data = [...]` 배열 편집
2. 각 객체 스키마
   ```js
   {
     category: '카테고리',     // ex) '프리앰프'
     name: '장비명',           // ex) 'Audient ASP880'
     min: 1600000,            // 예상 최저가 (number, ₩)
     avg: 1750000,            // 평균가 (number, ₩)
     max: 1900000,            // 최고가 (number, ₩)
     channels: 8,             // 추가되는 입력 채널 수 (없으면 0)
     img: 'https://…',        // 썸네일 URL
     drum: true               // (선택) 드럼 마이킹 세트 여부
   }
   ```
3. 저장 → 브라우저 새로고침 → UI 자동 반영

## 6. 디자인 가이드
- Apple San-Francisco 계열 시스템 폰트(`-apple-system` 등) 사용
- 라이트/다크 테마 전환 버튼 좌하단 고정
- **≥LG 브레이크포인트**(1024px)에서 우측 요약 패널 고정,
  모바일/태블릿에서는 자동 숨김(현 단계는 `hidden lg:block`)
- 카드: `bg-white` `dark:bg-zinc-800` `rounded-lg` `shadow-sm`
- 이미지 오류 시 `via.placeholder.com` 60×60 물음표 썸네일

## 7. 배포 방법 (기존 설정 기준)
1. **GitHub 레포지토리**: `gwak-dev/studio-quotes`
2. **Vercel**
   - `New Project` → GitHub 연동 → 해당 레포 선택
   - Framework = **Other** (Static)
   - Build Command = `–` (empty)
   - Output Directory = `.` (vercel.json로도 지정)
   - Deploy 후 `https://<project>.vercel.app` URL 확인

### 시크릿/서비스 계정 키 주의
`Concise Rope 461202.json`(Google 서비스 계정 JSON)을 반드시 `.gitignore`·`.vercelignore` 에 포함하거나 **키를 폐기**한 뒤 새 키를 환경 변수/Storage에 보관하세요.

## 8. 향후 로드맵 / TODO
- [ ] **검색/필터**: 카테고리·키워드별 실시간 필터링 UI
- [ ] **CSV/Google Sheets 내보내기**: 선택 결과를 CSV 다운로드 또는 시트로 자동 업로드
- [ ] **Responsive Summary Drawer**: 모바일에서도 토글 가능한 하단 슬라이드 패널
- [ ] **단가 자동 업데이트**: 환율·API 크롤링으로 가격 필드 자동 갱신
- [ ] **Vue/React 리팩터링**: 컴포넌트 기반 구조로 확장 (shadcn/ui + Next.js)
- [ ] **PWA**: 오프라인에서도 견적 계산 가능하도록 캐싱

## 9. 기여 규칙 (협업 시)
1. `main` → 배포 브랜치, 기능 추가는 `feature/<name>` 브랜치 생성 후 PR
2. 커밋 메시지 컨벤션: `feat: …`, `fix: …`, `chore: …`, `docs: …`
3. PR 템플릿: 변경 요약 · 스크린샷 필요 시 첨부

---
이 문서를 참고해 새 작업 공간/브랜치에서도 프로젝트 구조·설정·로드맵을 손쉽게 이어갈 수 있습니다. 🚀 
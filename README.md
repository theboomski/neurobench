# NeuroBench – Mini-Game Hub

## 로컬 개발 시작
```bash
npm install
npm run dev
# → http://localhost:3000
```

## 새 게임 추가하는 법
1. `content/games.json` 에 게임 항목 추가 (accent 색상 포함)
2. `components/games/YourGame.tsx` 컴포넌트 생성
3. `app/games/[id]/page.tsx` switch 문에 등록
→ SEO 블록, 광고, 레이아웃 자동 적용

## 광고 교체 (AdSense 승인 후)
`ad-slot` div → AdSense `<ins>` 태그로 교체
인터스티셜: `components/InterstitialAd.tsx` 내부 광고 영역 교체

## Vercel 배포
```bash
npm install -g vercel
vercel
```

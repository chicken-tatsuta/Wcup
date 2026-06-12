# World Cup Results Board

FIFA World Cup 2026 の試合データを FIFA の公開 API から取得して表示する Next.js アプリです。

## Local development

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開くと一覧画面、`http://localhost:3000/api/results` を開くと JSON を確認できます。

## Production build

```bash
npm run build
npm start
```

## Vercel deploy

Vercel の公式ドキュメントでは、Next.js プロジェクトはルートで `vercel` を実行するだけで初回デプロイできます。

```bash
npm i -g vercel
vercel
```

本番デプロイは次です。

```bash
vercel --prod
```

## Data source

- `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023`
- `idSeason=285023` は `FIFA World Cup 2026™`

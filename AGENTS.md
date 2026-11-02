# AGENTS.md — EcoTray AI Repository & Agent Guidelines

## 1. Project Context & Core Thesis

- Read `README.md` before changing behavior, claims, data, or presentation content. It is the Single Source of Truth for business logic and SSC 2026 requirements. If code and README disagree, identify the conflict; do not silently rewrite the rule.
- EcoTray AI is a **School-Canteen Decision Loop**: `Registered → Served [NFC] → Consumed/Wasted [ESP32-CAM + AI] → Decision`. It is not a generic “cheap Winnow camera,” an image-classification showcase, or a standalone meal-ticket application.
- Preserve the four decision outcomes:
  1. **Quantity mismatch:** `Registered > Served` → adjust preparation count or safety buffer.
  2. **Portion/Menu problem:** `Registered ≈ Served` with high component waste → keep meal count; adjust that component (for example, `-12%` Rau) or its recipe.
  3. **Dietary/Allergy Outlier:** abnormal 100% leftovers caused by peanut, lactose, seafood, health, or personal constraints → label `Outlier`, using the two-layer NFC pre-meal flag plus post-meal IQR trimming, and exclude it from general portion-reduction math.
  4. **Optimal:** `Registered ≈ Served` with low waste → `Giữ nguyên`.
- Final-round context: TOP 8 SSC 2026, a 5-minute live pitch, and 10-minute Q&A. Reliability, truthful evidence, feasibility, scalability, and a working prototype are requirements.

## 2. Repository Structure & Module Organization

This is a static React 19 + TypeScript + Vite application, not a backend. There is no React Router library: `src/router.tsx` is a small History API router. Each page has its own path — `/overview`, `/menu/{calendar,stats,analysis}` (`Lịch thực đơn`, `Thống kê`, `Phân tích`; `/menus` redirects to `/menu/stats`), `/vision`, `/log/{manual,nfc,calibration}`, `/data/{records,interventions,settings,thresholds}` and the standalone `/project` (`Thông tin dự án`, `src/ProjectInfo.tsx`, content in `src/projectContent.ts`, reached from the small link above `Đăng xuất`). `/` redirects to `/overview`; `src/App.tsx` renders the workspace from the URL and `src/main.tsx` chooses between workspace and project page. `index.html` sets `<base href="/">` so existing `./…` asset URLs work at any depth; hosts must return `index.html` for extensionless paths (`vercel.json` rewrite, `scripts/serve.mjs`, `start.py`). Stage keyboard shortcuts are intentionally disabled on `/project`.

- `src/main.tsx`: React entry. `src/App.tsx`: tabs, filters, CSV I/O, manual records, data separation, and local persistence under `ecotray-records`.
- `src/FinalRoundContext.tsx`: shared stage/hardware state, adapter, calibration and intervention storage. `src/Pipeline.tsx`, `src/OperationalPanels.tsx`, `src/DishDrawer.tsx`, `src/QuickLog.tsx` and `src/VisionLab.tsx`: final-round views.
- `src/PTNKVision.tsx`: mounted PTNK reference gallery (labelled photos, `data/ptnk-trays.json`; count read from the model artifact), calibration sandbox, stream and approval. `src/useVisionStream.ts` polls `/api/ai/analyze-tray`; hidden fallback listeners live in `FinalRoundContext`. `src/TrendChart.tsx`: trend chart (table for one day). Legacy unmounted UI screens and the unused dish-classifier (food bank) were removed; MobileNet remains only for `npm run test:model` and the embedding experiment.
- `src/styles.css` and `src/final-round.css`: responsive, accessible “EcoTray Intelligence” visual system.
- `src/lib/ecotrayVisionEngine.ts` exposes typed contracts over `lib/ptnk-vision.mjs` and shared pixel features. `scripts/train_ecotray_vision.py` generates `src/lib/ecotrayModels.json` from source images and metadata; see `docs/VISION-PTNK.md`. `api/ai/analyze-tray.mjs` is the deployed Vercel Function; `src/app/api/ai/analyze-tray/route.ts` is a Web Request/Response compatibility entry, not a Next.js migration.
- `lib/`: pure analytics, CSV/decision rules, and vision logic (`station-vision.mjs` OV2640 area reader with an opt-in `reference` empty-tray frame via `empty-reference.mjs`; `station-evaluation.mjs` weighed-data scoring and citation gate; `embedding-experiment.mjs` experiment helpers); `lib/*.test.mjs` are Node tests.
- `data/`: canonical demo CSV/summary and Portal/evaluation metadata. Active paths use `data/`, never the obsolete `demo-data/` path.
- `public/`: food images, MobileNet files and tray images copied into the build.
- `scripts/`: production offline-cache generation, PTNK feature extraction/training, `ingest_ptnk_photos.py` (new gallery photos: draft → label → merge, see `docs/VISION-PTNK.md`), `experiment-embeddings.mjs` (frozen-embedding Ridge experiment; writes `data/vision-experiments/`, never the shipped model), `evaluate-station.mjs` (weighed ESP32 evaluation; see `docs/STATION-WEIGHED-DATA.md`), model smoke test, and local static server. `start.py` is an alternative `dist/` server only.
- `vite.config.ts`: relative asset base and `dist/` output. `api/iot/[action].mjs` exposes public Vercel Node Functions via `server/`; production uses shared Redis with atomic idempotency. Local RAM fallback is development-only. See `docs/IOT.md`; raw image processing still requires the external AWS worker.

## 3. Hardware-Cloud-Web Integration & Live Stage Demo Contract

Minh Khang’s pipeline is `ESP32-CAM + debounced proximity state machine + NFC UID reader → API Gateway/Lambda/S3`; Sơn Hoàng’s consumer is `ecotray-ai.vercel.app`. The following is the v1 contract. Dashboard routes are implemented and contract-tested locally; deployment and physical AWS/ESP32/NFC acceptance remain unverified.

- `POST /api/iot/nfc-scan`, JSON body: `{ "eventId", "schoolId", "stationId", "cardUidHash", "scannedAt" }`. Use ISO-8601 UTC and an anonymized/HMAC UID, never a student name. Return `{ "eventId", "status": "VALID|ALLERGY_WARNING|ALREADY_REDEEMED|UNKNOWN_CARD", "servedCount", "menu": { "menuId", "name" }, "allergyFlags": [], "recordedAt" }`.
- `POST /api/iot/tray-capture`: raw `image/jpeg` body (expected 800×600, approximately 45 KB), with `X-School-Id`, `X-Station-Id`, `X-Captured-At`, and `Idempotency-Key` headers. Return HTTP 202: `{ "captureId", "status": "QUEUED", "statusUrl" }`. The sensor must debounce for 300 ms, take one frame, lock, and re-arm only after absence for more than 1.000 ms.
- `GET /api/iot/status?schoolId=ptnk&since=<ISO-8601>` returns `{ "online", "lastUpdatedAt", "servedCount", "latestNfc", "latestCapture" }`; capture status is `QUEUED|PROCESSING|COMPLETED|FAILED`, and a completed result contains `rice`, `vegetables`, `main` percentages plus `isOutlier` and `recommendation`.
- Errors use `{ "error": { "code", "message", "details" } }`. Validate at route boundaries. POSTs must atomically honor `Idempotency-Key`; reject a reused key with a different body.

Any hardware view or `Live Demo Chung Kết` mode must keep deterministic keyboard fallbacks and local fallback state: `1` = normal NFC, `2` = allergy NFC, `3` = unknown NFC; repeating `1`/`2` tests duplicate rejection. `Space` or `4` = tray capture and automatic analysis; recommendation is approved with the keyboard-accessible `Bếp Phê Duyệt` button. The fallback must run without Wi-Fi, be resettable, and remain isolated from real records and simulation analytics. Network success may update the same event reducer, but must never be required for the five-minute pitch.

## 4. UI/UX & Scalability Guardrails

- All user-facing labels, messages, badges, and tooltips must use natural professional Vietnamese, including `Cơm`, `Rau`, `Món chính`, `Đăng ký`, `Thực nhận`, `Phần còn lại`, and `Khuyến nghị vận hành`.
- Preserve three school adapters: **EcoTray Lite** (ESP32-CAM + Excel/Form menu input; no NFC/Portal), **EcoTray Standard** (class-based reporting + ESP32-CAM), and **EcoTray Pro** (Portal sync + Paperless NFC Gate + Allergy Filter + ESP32-CAM). Do not hard-code PTNK assumptions into shared analytics or UI primitives.
- Privacy by design is mandatory: no facial recognition, face capture, student names, or identifiable student photos in tray logs. Store anonymized event IDs and UID hashes only; expire raw S3 tray images after 30 days.
- Never attribute the gallery Ridge MAE (`src/lib/ecotrayModels.json`) to the live reader `ov2640-area-v1`; the latter has no measured error until `scripts/evaluate-station.mjs` passes its gate. Read the figure from the artifact, never hard-code it.
- Preserve responsive behavior, keyboard access, focus visibility, reduced-motion support, and the restrained green/neutral EcoTray Intelligence aesthetic. Prefer small typed components over expanding the already dense `App.tsx`.

## 5. Build, Verification & Coding Conventions

- Prerequisite: Node `>=22.13.0`. Install reproducibly with `npm ci`; run development with `npm run dev`; serve an existing production build locally with `npm start`.
- Run tests with `npm test`, model smoke verification with `npm run test:model`, and production build verification with `npm run build`.
- Typecheck every change before completion:
  `npx tsc --noEmit --allowJs --checkJs false --jsx react-jsx --module ESNext --target ES2022 --moduleResolution Bundler --skipLibCheck src/*.ts src/*.tsx`
- There is currently no ESLint dependency, config, or `lint` script. Do not claim `npm run lint` passes. If linting is introduced, add an explicit `lint` script to `package.json`, commit its config, update this guide, and run it before handoff.
- Before completing any task, always run typechecking and `npm run build`; for logic/data/model changes also run `npm test` and `npm run test:model`. Search for stale paths and verify that Vercel still builds to `dist/`.
- Use TypeScript for UI code, keep analytics deterministic and testable in `lib/`, validate files/API input at boundaries, and avoid `any` in new contracts. Use existing CSS classes/tokens and responsive patterns; this repository does not use Tailwind CSS, so do not describe or introduce Tailwind without an explicit migration decision.

## 6. Operational UI cleanup (29/10/2026)

Menu analysis opens a compact list. Photo inspection lives under Vision → Kiểm tra ảnh (the Thử kịch bản view was removed on 2026-11-01); the simulated nutrition panel is rendered from `src/Pipeline.tsx`, and scale samples are entered in Ghi nhận khay (`src/QuickLog.tsx`). Station data is not embedded in menu reports. Project evidence, roadmap, cost and before/after scenarios live on the standalone `/project` page (Thông tin dự án), updated from the SSC 2026 final slides (ver2); the 3-year plan data is `roadmap` in `lib/decision-scenarios.ts`. Slide claims without a repository source (for example MAE 6.8% / “93% chính xác”) are not shown; read measured error from the model artifact. Do not restore generic nutrition examples inside individual dish drawers.

Vision and legacy worker decisions share `ecotray-interventions-v1`, retain `hardware|simulation|reference-fallback`, and are local records, not commands sent to the kitchen. The station chooses the latest device capture, with explicit reference fallback. Scale samples affect the simulated gram conversion only; PTNK model portions remain clearly labelled assumptions.

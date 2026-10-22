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

## 2. Strict Data Integrity Rules & Canonical Metrics

Never combine **REAL DATA — Dữ liệu thực địa PTNK** with **DEMO / SIMULATION DATA — Dữ liệu mô phỏng**. Keep source fields, badges, legends, and simulation disclaimers visible in the UI, exports, slides, and derived statistics. Portal menu names/images may be real while tray counts and waste values remain simulated; say both facts explicitly.

Canonical values (do not invent alternatives):

- **PTNK real baseline:** `1.017` fixed meals/day, approximately `183.000` meals/year over 180 school days; `4` dishes/day; `5–7` surplus portions/dish; approximately `44g` plate waste/tray and `8,0 tấn/năm`. From 144 observed trays: Rau `28,8%`, Cơm `6,3%`, Món chính `5,2%`. Initial 07/10 pilot: 51 trays, `35,3%` finished and `64,7%` with leftovers.
- **Simulation dataset:** `1.280` trays across five source-menu days (`12/10/2026–16/10/2026`), 20 real PTNK Portal dishes, `3.131` component observations (`81,5%` valid), `14,6%` average leftover, and `11/20` dishes flagged. The simulated intervention changes `63,1 kg/ngày` to `52,5 kg/ngày` (`-16,8%`).
- **Unit economics:** Vision Station CAPEX approximately `290.000 VNĐ/trạm`; optional NFC reader `195.000 VNĐ`, or `0 VNĐ` with Android Web NFC. AWS Serverless OPEX is `<45.000 VNĐ/tháng/trường` (approximately `38.500 VNĐ`). Estimated savings are `35,5 triệu VNĐ/năm`: `5,5 triệu` paper tickets plus `30 triệu` ingredients. Keep estimates labelled, not field-verified.

## 3. Repository Structure & Module Organization

This is a static React 19 + TypeScript + Vite application, not a backend. There is no React Router: `src/App.tsx` switches five tabs (`Tổng quan`, `Phân tích thực đơn`, `EcoTray Vision`, `Ghi nhận khay`, `Dữ liệu`) with component state.

- `src/main.tsx`: React entry. `src/App.tsx`: tabs, filters, CSV I/O, manual records, data separation, and local persistence under `ecotray-records`.
- `src/FinalRoundContext.tsx`: shared stage/hardware state, adapter, calibration and intervention storage. `src/LiveDemo.tsx`, `src/Pipeline.tsx`, `src/OperationalPanels.tsx`, `src/DishDrawer.tsx`, `src/QuickLog.tsx` and `src/VisionLab.tsx`: final-round views.
- `src/EcoVision.tsx`: mounted tray demo. `src/TrendChart.tsx`: trend chart. `src/imageFeatures.ts`: browser-side TensorFlow.js/MobileNet features. `src/vision.tsx` and `src/DishVision.tsx`: calibration/classification components not mounted by `App.tsx`.
- `src/styles.css` and `src/final-round.css`: responsive, accessible “EcoTray Intelligence” visual system.
- `lib/`: pure analytics, CSV/decision rules, tray measurement, dish classification, and vision logic; `lib/*.test.mjs` are Node tests.
- `data/`: canonical demo CSV/summary and Portal/evaluation metadata. Active paths use `data/`, never the obsolete `demo-data/` path.
- `public/`: food images, `food-bank.json`, MobileNet files, tray images, and calibration data copied into the build.
- `scripts/`: production offline-cache generation, calibration, dish-bank generation, model smoke test, and local static server. `start.py` is an alternative `dist/` server only.
- `vite.config.ts`: relative asset base and `dist/` output. `api/iot/[action].mjs` now exposes authenticated Vercel Node Functions via `server/`; production uses shared Redis with atomic idempotency. Local RAM fallback is development-only. See `docs/IOT.md`; raw image processing still requires the external AWS worker.

## 4. Hardware–Cloud–Web Integration & Live Stage Demo Contract

Minh Khang’s pipeline is `ESP32-CAM + debounced proximity state machine + NFC UID reader → API Gateway/Lambda/S3`; Sơn Hoàng’s consumer is `ecotray-ai.vercel.app`. The following is the v1 contract. Dashboard routes are implemented and contract-tested locally; deployment and physical AWS/ESP32/NFC acceptance remain unverified.

- `POST /api/iot/nfc-scan`, JSON body: `{ "eventId", "schoolId", "stationId", "cardUidHash", "scannedAt" }`. Use ISO-8601 UTC and an anonymized/HMAC UID, never a student name. Return `{ "eventId", "status": "VALID|ALLERGY_WARNING|ALREADY_REDEEMED|UNKNOWN_CARD", "servedCount", "menu": { "menuId", "name" }, "allergyFlags": [], "recordedAt" }`.
- `POST /api/iot/tray-capture`: raw `image/jpeg` body (expected 800×600, approximately 45 KB), with `X-School-Id`, `X-Station-Id`, `X-Captured-At`, and `Idempotency-Key` headers. Return HTTP 202: `{ "captureId", "status": "QUEUED", "statusUrl" }`. The sensor must debounce for 300 ms, take one frame, lock, and re-arm only after absence for more than 1.000 ms.
- `GET /api/iot/status?schoolId=ptnk&since=<ISO-8601>` returns `{ "online", "lastUpdatedAt", "servedCount", "latestNfc", "latestCapture" }`; capture status is `QUEUED|PROCESSING|COMPLETED|FAILED`, and a completed result contains `rice`, `vegetables`, `main` percentages plus `isOutlier` and `recommendation`.
- Errors use `{ "error": { "code", "message", "details" } }`. Validate at route boundaries. POSTs must atomically honor `Idempotency-Key`; reject a reused key with a different body.

Any hardware view or `Live Demo Chung Kết` mode must keep deterministic keyboard fallbacks and local fallback state: `1` = normal NFC, `2` = allergy NFC, `3` = unknown NFC; repeating `1`/`2` tests duplicate rejection. `Space` or `4` = tray capture and automatic analysis; recommendation is approved with the keyboard-accessible `Bếp Phê Duyệt` button. The fallback must run without Wi-Fi, be resettable, and remain isolated from real records and simulation analytics. Network success may update the same event reducer, but must never be required for the five-minute pitch.

## 5. UI/UX & Scalability Guardrails

- All user-facing labels, messages, badges, and tooltips must use natural professional Vietnamese, including `Cơm`, `Rau`, `Món chính`, `Đăng ký`, `Thực nhận`, `Phần còn lại`, and `Khuyến nghị vận hành`.
- Preserve three school adapters: **EcoTray Lite** (ESP32-CAM + Excel/Form menu input; no NFC/Portal), **EcoTray Standard** (class-based reporting + ESP32-CAM), and **EcoTray Pro** (Portal sync + Paperless NFC Gate + Allergy Filter + ESP32-CAM). Do not hard-code PTNK assumptions into shared analytics or UI primitives.
- Privacy by design is mandatory: no facial recognition, face capture, student names, or identifiable student photos in tray logs. Store anonymized event IDs and UID hashes only; expire raw S3 tray images after 30 days.
- Preserve responsive behavior, keyboard access, focus visibility, reduced-motion support, source badges, and the restrained green/neutral EcoTray Intelligence aesthetic. Prefer small typed components over expanding the already dense `App.tsx`.

## 6. Build, Verification & Coding Conventions

- Prerequisite: Node `>=22.13.0`. Install reproducibly with `npm ci`; run development with `npm run dev`; serve an existing production build locally with `npm start`.
- Run tests with `npm test`, model smoke verification with `npm run test:model`, and production build verification with `npm run build`.
- Typecheck every change before completion:
  `npx tsc --noEmit --allowJs --checkJs false --jsx react-jsx --module ESNext --target ES2022 --moduleResolution Bundler --skipLibCheck src/*.ts src/*.tsx`
- There is currently no ESLint dependency, config, or `lint` script. Do not claim `npm run lint` passes. If linting is introduced, add an explicit `lint` script to `package.json`, commit its config, update this guide, and run it before handoff.
- Before completing any task, always run typechecking and `npm run build`; for logic/data/model changes also run `npm test` and `npm run test:model`. Search for stale paths and verify that Vercel still builds to `dist/`.
- Use TypeScript for UI code, keep analytics deterministic and testable in `lib/`, validate files/API input at boundaries, and avoid `any` in new contracts. Use existing CSS classes/tokens and responsive patterns; this repository does not use Tailwind CSS, so do not describe or introduce Tailwind without an explicit migration decision.

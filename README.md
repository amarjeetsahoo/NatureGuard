<div align="center">

# 🌿 NatureGuard

**AI-Powered Carbon Footprint Tracker**

[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%202.5-4285F4.svg?logo=google)](https://deepmind.google/technologies/gemini/)
[![Backend: Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg?logo=supabase)](https://supabase.com/)

*Understand your environmental impact. Track habits. Take action.*

> 📹 **[Watch the E2E Demo →](#-demo)**

</div>

---

## 🌍 What is NatureGuard?

NatureGuard is a **fully client-side, AI-powered Progressive Web App (PWA)** that helps individuals measure, understand, and actively reduce their personal carbon footprint.

Users log everyday activities — commuting, shopping, eating, travelling — and the app computes their CO₂ impact in real time. Gemini AI then provides personalised coaching, interprets natural language inputs, generates what-if simulations, and rewards consistent eco-actions through a gamified XP and badge system.

---

## 🎬 Demo

![NatureGuard E2E Desktop Demo](e2e_desktop_test_1781859965084.webp)

> Full desktop E2E walkthrough — login through all app features, validated and functional.

A full end-to-end walkthrough covers:
- **Sign-in → Dashboard** — session restoration, onboarding for new Google OAuth users
- **Log Activity** — manual form, NL-voice input, AI-parsed natural language
- **AI Carbon Coach** — streaming chat, suggestion chips, context-aware advice
- **What-If Simulator** — scenario modelling with visualised CO₂ delta
- **Eco Actions** — AI-curated action suggestions; adopt or dismiss
- **Insights** — weekly trend charts, category breakdowns
- **Rewards & Gamification** — XP, levelling, badge unlocks with confetti
- **Settings** — profile edit, Gemini API key, change password, badge showcase
- **Dark / Light mode** — desktop toggle + mobile-profile-modal exclusive toggle

---

## ✨ Feature Overview

| Feature | Description |
|---|---|
| 🔐 **Auth** | Email/password, Google OAuth, magic-link, password reset via Supabase |
| 🧮 **Carbon Calculator** | Science-backed emission factors for transport, food, energy, shopping, travel |
| 🗣️ **NL Activity Logger** | Type or speak activities in plain English; AI parses category, quantity, CO₂ |
| 🎙️ **Voice Input** | Web Speech API with live interim transcription across logger and simulator |
| 🤖 **AI Carbon Coach** | Streaming chat powered by Gemini 2.5 Flash Lite; suggests follow-up chips |
| 🔬 **What-If Simulator** | Model lifestyle changes ("what if I went vegan for a week?") with CO₂ delta |
| ⚡ **Eco Actions** | AI-generated & curated eco-actions; track adopted/dismissed per user |
| 📊 **Insights** | Weekly carbon trend charts; per-category breakdown; eco score A–F grade |
| 🏆 **Gamification** | XP points, 7 player levels, 11 badges, daily streaks, confetti on milestones |
| 🌗 **Theme System** | Dark/light mode; persisted in `localStorage`; mobile toggle in profile modal |
| 📱 **Responsive / PWA** | Mobile-first bottom nav, scrollable nav bar, Service Worker registration |
| 🖨️ **Sustainability Certificate** | Shareable, styled certificate card with eco-score, footprint, streaks & badges |
| 🔑 **Bring-Your-Own-Key** | Connect personal Gemini API key; 10 free default-key requests per user |

---

## 🏗️ Architecture

NatureGuard is a **vanilla JS SPA** — no framework, no virtual DOM, just modern ES Modules compiled by Vite.

```
natureguard/
├── index.html                  # App shell (top-bar, sidebar, bottom-nav, main-content)
│
├── css/
│   ├── reset.css               # Minimal CSS reset
│   ├── design-tokens.css       # CSS custom properties (colours, spacing, radii, shadows)
│   ├── animations.css          # Keyframe animations (fadeIn, slideUp, pulseGlow, etc.)
│   ├── components.css          # Reusable component styles (btn, card, input, toast, modal)
│   └── views.css               # View-specific & responsive layout styles
│
├── src/
│   ├── main.js                 # Boot: theme init, session check, auth listener, router start
│   ├── router.js               # Hash-based SPA router with lazy-loaded view modules + auth guard
│   │
│   ├── auth/
│   │   ├── supabaseClient.js   # Supabase client singleton
│   │   ├── authService.js      # signIn/Out, Google OAuth, magic-link, password update
│   │   └── authGuard.js        # Redirect unauthenticated users away from private routes
│   │
│   ├── ai/
│   │   ├── geminiService.js    # Gemini API singleton: generate / generateJSON / generateStream
│   │   ├── prompts.js          # System-instruction prompt strings (coach, onboarding)
│   │   ├── nlLogger.js         # Natural-language → structured activity parser
│   │   ├── coach.js            # Coach session builder (history + system prompt)
│   │   ├── whatif.js           # What-If scenario AI handler
│   │   ├── actionsAI.js        # AI-curated eco-action generator
│   │   ├── insights.js         # AI weekly insights digest generator
│   │   └── profiler.js         # Onboarding AI profiler (lifestyle Q&A)
│   │
│   ├── modules/
│   │   ├── db.js               # Supabase CRUD helpers (activities, profile, actions, digests)
│   │   ├── calculator.js       # CO₂ emission factor tables + calculation functions
│   │   ├── rewards.js          # XP, level, streak, badge engine (event-driven)
│   │   ├── navigation.js       # Render top-bar, sidebar, bottom-nav; profile modal + theme switch
│   │   ├── eventBus.js         # Tiny pub/sub (POINTS_UPDATED, BADGE_EARNED, streak:updated)
│   │   ├── score.js            # Eco-score (A–F) grader from weekly CO₂ total
│   │   └── humanizer.js        # CO₂ → human-friendly equivalents ("like driving 12 km")
│   │
│   ├── views/                  # One module per route; each exports render(container)
│   │   ├── landing.js          # Public landing / hero page
│   │   ├── auth.js             # Sign-in / Sign-up / Magic-link / Password-reset forms
│   │   ├── onboarding.js       # AI-driven lifestyle Q&A for new users
│   │   ├── dashboard.js        # Main stats, charts, streak card, certificate generator
│   │   ├── logActivity.js      # Activity logger (manual, NL text, voice)
│   │   ├── coach.js            # Streaming AI chat view with dynamic suggestion chips
│   │   ├── whatif.js           # Scenario simulator with voice input
│   │   ├── actions.js          # Eco-actions list (adopt / dismiss)
│   │   ├── insights.js         # Weekly digest + category charts
│   │   ├── rewards.js          # XP progress bar + badge showcase
│   │   ├── settings.js         # Profile edit, API key, change password, badge grid, sign-out
│   │   └── notFound.js         # 404 fallback
│   │
│   ├── utils/
│   │   ├── dom.js              # $() / $$() helpers + getInitials
│   │   ├── toast.js            # Toast notification system (success / error / info / badge)
│   │   ├── loader.js           # Full-screen leaf loader show/hide
│   │   ├── confetti.js         # Canvas confetti burst for badge unlocks
│   │   └── voice.js            # Web Speech API wrapper (interim + final transcription)
│   │
│   └── data/                   # Static reference data (emission factors, action templates)
│
├── supabase-schema.sql         # Full Postgres schema — run once in Supabase SQL Editor
├── vite.config.js              # Vite config
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS (ES Modules), HTML5, CSS3 |
| **Build Tool** | Vite 8 |
| **AI** | Google Gemini 2.5 Flash Lite (REST API — generate, JSON, streaming SSE) |
| **Backend / DB** | Supabase (Postgres + Auth + Row Level Security) |
| **Charts** | Chart.js / Highcharts |
| **Share Image** | html2canvas |
| **Animations** | GSAP, CSS keyframes |
| **Voice** | Web Speech API (SpeechRecognition) |
| **Auth** | Supabase Auth — Email/Password, Google OAuth, Magic Link, Password Reset |
| **Offline/PWA** | Service Worker (registered at boot) |

---

## 🗄️ Database Schema

Four tables, all protected by **Row Level Security** (users only see their own data):

| Table | Purpose |
|---|---|
| `profiles` | User settings, streaks, XP points, badges (JSONB), API key |
| `activities` | Logged carbon activities (category, quantity, CO₂ kg, source) |
| `user_actions` | Eco-actions per user (suggested / adopted / dismissed) |
| `weekly_digests` | Cached AI-generated weekly summaries |

Auto-trigger creates a `profiles` row on every new Supabase auth user signup.

---

## 🤖 AI Integration

### Gemini Service (`src/ai/geminiService.js`)
A singleton class wrapping all Gemini API calls:
- **`generate()`** — standard text generation
- **`generateJSON()`** — deterministic structured output (`application/json` MIME type)
- **`generateStream()`** — Server-Sent Events streaming for real-time chat
- **Rate limiting** — local 14 RPM guard with exponential backoff on 429s
- **Default key** — 10 free requests per user; prompts BYOK after limit

### AI Features
| Module | What the AI does |
|---|---|
| **NL Logger** | Parses "drove 15 km to work" → `{category, activity, quantity, unit, co2_kg}` |
| **Coach** | Persistent chat history + system prompt personalised with user's real stats |
| **What-If** | Simulates hypothetical scenarios and quantifies CO₂ delta |
| **Actions AI** | Generates 3–5 personalised eco-action suggestions from user profile |
| **Insights** | Weekly digest narrative from activity snapshot |
| **Profiler** | Guided onboarding Q&A to estimate baseline footprint |
| **Suggestion Chips** | Coach responses include a `---SUGGESTIONS---` block parsed into clickable chips |

---

## 🎮 Gamification System

| Component | Details |
|---|---|
| **XP** | +10 per activity logged; more for bulk logs |
| **Levels** | 7 tiers: Seed → Sprout → Sapling → Young Tree → Mighty Oak → Forest Guardian → Nature Legend |
| **Badges** | 11 badges: first log, streak milestones (3/5/10/15/30/90 days), category-specific, first eco-action |
| **Streaks** | Daily streak tracked via `last_logged_date`; resets if a day is missed |
| **Events** | `eventBus` emits `POINTS_UPDATED`, `BADGE_EARNED`, `streak:updated` for reactive UI updates |
| **Celebration** | Badge unlock triggers confetti burst + styled toast |

---

## 📱 Mobile Experience

- **Bottom navigation bar** — scrollable, flex-wrap, all routes accessible
- **Floating Action Button (FAB)** — prominent `+` Log Activity button
- **Profile modal** — mobile-exclusive Appearance (dark/light) toggle (hidden ≥ 481 px)
- **Toast positioning** — centred full-width on mobile, bottom-right on desktop
- **Responsive cards** — fluid padding via `clamp()`
- **Safe-area insets** — `env(safe-area-inset-bottom)` for notched devices

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- A [Supabase](https://supabase.com/) project
- A [Google Gemini API Key](https://aistudio.google.com/) (optional — 10 free default requests included)

### 1. Clone & Install
```bash
git clone https://github.com/amarjeetsahoo/NatureGuard.git
cd NatureGuard
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_DEFAULT_GEMINI_KEY=your_default_gemini_key  # optional
```

### 3. Set Up the Database
Open your Supabase project → **SQL Editor** → paste and run `supabase-schema.sql`.

### 4. Run Locally
```bash
npm run dev
# App available at http://localhost:3000
```

### 5. Build for Production
```bash
npm run build
npm run preview
```

---

## 📁 Key File Reference

| File | Role |
|---|---|
| [`src/main.js`](src/main.js) | App boot, theme init, auth listener, PWA SW registration |
| [`src/router.js`](src/router.js) | Hash-based router, lazy imports, auth guard |
| [`src/ai/geminiService.js`](src/ai/geminiService.js) | All Gemini API calls, rate limiting, streaming |
| [`src/modules/rewards.js`](src/modules/rewards.js) | XP, badges, streaks, level-up logic |
| [`src/modules/navigation.js`](src/modules/navigation.js) | Navbar render, profile modal, theme toggle |
| [`src/modules/calculator.js`](src/modules/calculator.js) | Emission factor tables, CO₂ calculation |
| [`src/utils/voice.js`](src/utils/voice.js) | Web Speech API wrapper |
| [`css/design-tokens.css`](css/design-tokens.css) | All CSS custom properties (design system) |
| [`supabase-schema.sql`](supabase-schema.sql) | Complete Postgres schema |

---

## 🛡️ Security

- All database tables enforce **Row Level Security** — users can only read/write their own rows.
- Gemini API keys are stored in the user's `profiles` row (encrypted at rest by Supabase).
- Auth tokens are managed by Supabase Auth; the app never handles raw passwords except for Supabase's own update endpoint.
- Google OAuth uses `prompt: 'consent'` + `access_type: 'offline'` to ensure refresh token issuance.

---

<div align="center">
  <strong>🌿 Guard Your Nature. Built with ❤️ for the planet.</strong>
</div>

# NatureGuard 🌿

![NatureGuard Demo Video](./public/demo.webp)

**NatureGuard** is an AI-powered carbon footprint tracker and personal climate coach. It helps you understand, track, and actively reduce your environmental impact through intuitive logging, data visualization, and personalized AI-driven insights. 

Built with modern web technologies, NatureGuard offers a sleek, gamified, and highly responsive user experience designed to make sustainable living engaging and achievable.

---

## ✨ Key Features

### 1. Intelligent Activity Logging
- Log daily activities across 5 core categories: **Transport, Food, Energy, Shopping, and Travel**.
- **Natural Language Input**: Use the power of Gemini AI to simply type what you did (e.g., *"I drove 15km to work and had a beef burger for lunch"*) and NatureGuard will automatically categorize, quantify, and log the CO₂e emissions.

### 2. Personal AI Climate Coach
- A persistent, context-aware conversational AI assistant powered by Google's Gemini Flash.
- Chat with your coach to get personalized tips, analyze your biggest emission sources, and receive tailored advice based on your historical logged data.

### 3. Comprehensive Dashboard & Insights
- **Live Stats**: View your weekly, monthly, and daily CO₂ totals, compared against global benchmarks.
- **Eco Score**: A dynamic 0-100 score and grade (A+ to F) evaluating your sustainability.
- **Visualizations**: Interactive Chart.js donut charts for category breakdowns and trend lines for daily tracking.
- **Trend Deltas**: Automatically calculates percentage improvements or regressions compared to prior periods.

### 4. What-If Scenario Simulator
- Test hypothetical lifestyle changes before committing to them.
- Wondering how much you'd save by taking the train instead of driving for a 20km commute? Type it in, and the AI will project the CO₂ impact and compare it against your profile's baseline.

### 5. Action Plans & Gamification
- **Adopt Actions**: The AI suggests specific, actionable steps to reduce your footprint (e.g., "Meatless Mondays", "Switch to LEDs"). Adopt them to build a personalized action plan.
- **Streaks & Badges**: Maintain a logging streak to unlock badges like *First Step 🌱*, *Week Warrior ⚡*, and *Climate Hero 🌍*. 

### 6. Progressive Web App (PWA) Support
- Offline-capable and installable on mobile devices via a Service Worker and manifest file. 
- Fast loading times and a native-app feel on any device.

---

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, custom CSS3 Design System.
- **Build Tool**: Vite (Lightning fast HMR and optimized production builds).
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Email/Password & OAuth).
- **AI Engine**: Google Gemini API (`@google/genai`).
- **Data Visualization**: Chart.js.
- **Utility**: `html2canvas` (for the dashboard sharing feature).

---

## 📂 Project Architecture

NatureGuard uses a modular, component-driven approach despite being built in vanilla JavaScript. 

```
natureguard/
├── css/                   # Custom Design System
│   ├── animations.css     # Keyframe animations
│   ├── components.css     # Buttons, cards, badges, inputs
│   ├── design-tokens.css  # CSS Variables (colors, typography)
│   ├── reset.css          # Modern CSS reset
│   └── views.css          # Page-specific layout styles
├── public/                # Static assets & PWA files
│   ├── demo.webp          # Demo video mapping
│   ├── manifest.json      # PWA configuration
│   └── service-worker.js  # Offline caching strategies
├── src/
│   ├── ai/                # AI integration layer (Gemini context building)
│   ├── auth/              # Supabase authentication logic & guards
│   ├── data/              # Static constants (Emission factors, etc)
│   ├── modules/           # Core logic (Calculator, DB API, Score logic)
│   ├── utils/             # Helpers (DOM querying, Toasts)
│   ├── views/             # Individual SPA page modules (Dashboard, Coach, etc)
│   ├── main.js            # App entry point & initialization
│   └── router.js          # Hash-based SPA router
├── package.json           # Project dependencies
└── README.md              # This file
```

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- A Supabase Project
- A Google Gemini API Key

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/natureguard.git
cd natureguard
npm install
```

### 2. Environment Configuration
Since the app connects directly to Supabase and Gemini, you must configure your API keys. 
In a production environment, these would be injected during build time or handled securely, but for local testing, the app asks the user to provide their Gemini Key in the Settings page, and connects to Supabase via `src/auth/supabaseClient.js`.

To configure Supabase, edit `src/auth/supabaseClient.js` and input your project URL and anon key.

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 🛡 Security & Privacy
- **Row Level Security (RLS)**: Ensured at the database level so users can only ever read and write their own data.
- **Client-Side AI**: Gemini API keys are entered by the user in the Settings panel and stored locally in the browser's `localStorage`. They are never sent to a backend server.

---

*Guard Your Nature. Built with ❤️ for the planet.*

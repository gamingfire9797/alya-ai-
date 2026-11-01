# Alya AI Companion (`com.alya.companion`)

Expressive anime-inspired AI voice & multimodal companion built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Express**, **Google Gemini API (`@google/genai`)**, and **Capacitor / Android Native WebView Bridge**.

---

## Cross-Platform Support

1. **Android Native APK (`com.alya.companion`)**
   - Packaged via Capacitor + Native `MainActivity.java` (`WebViewAssetLoader` serving bundled assets over `https://appassets.androidplatform.net`) and `AlyaForegroundService.java`.
   - Supports voice-triggered Android app launching (`AndroidBridge.findMatchingApps`, `launchPackage`, `launchAppSearch`), system settings intents, persistent foreground companion notification (`microphone|mediaProjection`), and screen capture consent (`MediaProjectionManager`).
2. **Android Phones, Tablets & Foldables (Web & PWA)**
   - Installable Progressive Web App (`manifest.json` with `any` and `maskable` icons) and adaptive viewport layout (`100dvh`, `viewport-fit=cover`, safe-area insets).
3. **iPhone & iPad (iOS / iPadOS)**
   - Full mobile Safari support + **Add to Home Screen** standalone Web App mode (`apple-touch-icon.png`, `apple-mobile-web-app-capable`).
4. **Windows & macOS Desktop**
   - Responsive desktop browser experience and one-click desktop PWA installation via Chrome / Edge.

---

## 1. Local Setup & Development

### Prerequisites
- **Node.js** 20+ and **npm**
- A **Google Gemini API Key** (`GEMINI_API_KEY`)

### Install Dependencies
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and configure your keys:
```bash
cp .env.example .env
```

| Variable | Where Used | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Backend (`server.ts`) | Server-side Gemini API key for chat, voice TTS (`gemini-2.5-flash-preview-tts`), and screen vision. Never bundled into frontend code or APKs. |
| `APP_URL` | Backend (`server.ts`) | Public HTTPS URL of your hosted Express server. |
| `VITE_API_BASE_URL` | Frontend / APK Build | Optional HTTPS backend base URL used by packaged Android APK builds when calling `/api/*`. Can also be customized at runtime inside **Settings → Cross-Platform & Server Connection**. |

### Start Development Server
```bash
npm run dev
```
Runs the Express backend + Vite middleware on `http://localhost:3000`.

### Type-Check & Production Web Build
```bash
npm run lint
npm run build
```

---

## 2. Backend Hosting Architecture for Android APK

Because an Android APK runs on the user's phone rather than on the Node.js server, all `/api/*` requests (`chat/stream`, `tts`, `screen-understand`, `work/*`, `profile`, `admin/*`) are routed over HTTPS via `src/utils/apiConfig.ts`:
- **On Web / Hosted PWA**: Uses same-origin relative `/api/*` requests automatically.
- **Inside the Android APK**: Automatically routes `/api/*` requests to your deployed HTTPS backend (`VITE_API_BASE_URL` or the configured Cloud Run backend URL, which can also be updated anytime in **Settings → Cross-Platform & Server Connection** without rebuilding the APK).
- **Security**: `GEMINI_API_KEY` stays strictly on the backend server (or in user-supplied device storage if the user tests their own personal key in Settings).

---

## 3. Building the Android APK (`com.alya.companion`)

### Prerequisites for Android Compilation
- **Android Studio** (Iguana / Jellyfish / Koala or newer)
- **JDK 17** (`JavaVersion.VERSION_17`)
- **Android SDK Platform 34** (`compileSdk 34`, `targetSdk 34`, `minSdk 24`)

### Step 1: Build Web Assets & Sync Capacitor Android
```bash
npm run cap:sync
```
This runs `vite build` (generating `dist/`) and `cap sync android`, which copies the production web bundle into `android/app/src/main/assets/public/` and updates Capacitor configuration files.

### Step 2: Build Debug APK via Android Studio or Gradle CLI
- **Option A — Android Studio (Recommended)**:
  1. Run `npm run cap:open:android` or open the `/android` folder in Android Studio.
  2. Wait for Gradle sync to complete.
  3. Select **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
  4. The generated debug APK will be located at:
     `android/app/build/outputs/apk/debug/app-debug.apk`
- **Option B — Command Line (with JDK 17 & Android SDK installed)**:
  ```bash
  cd android
  ./gradlew assembleDebug
  ```

---

## 4. iOS & Desktop Packaging Options

- **iPhone / iPad (PWA)**: Open the hosted HTTPS URL in Safari → tap **Share** → **Add to Home Screen**.
- **iOS Native (Capacitor)**: On a macOS machine with Xcode installed, run `npm install @capacitor/ios && npx cap add ios && npx cap sync ios`, then open `ios/App/App.xcworkspace` in Xcode. Note: Android-specific intents (`PackageManager`, `MediaProjection`, Android foreground services) automatically degrade to standard web/iOS equivalents on iOS.
- **Windows / macOS Desktop**: Install directly as a standalone desktop app from Chrome or Edge via the address bar install icon or **Settings → Install Alya App on Device**.

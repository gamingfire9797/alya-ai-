/**
 * Capacitor Configuration for Alya AI Companion Android Packaging
 * Preserves the React 19 + Vite UI, Web Speech API / WebRTC audio, and Express API bridge.
 */

const config = {
  appId: 'com.alya.companion',
  appName: 'Alya AI Companion',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;

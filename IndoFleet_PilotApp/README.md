# IndoFleet Delivery App (React Native + Expo)

Dedicated mobile application for IndoFleet delivery operations. Automatically tracks and broadcasts real-time GPS coordinates, speed, altitude, battery percentage, and heading back to the IndoFleet Command Center and Tracking HUD in the foreground and background.

---

## 🚀 Quick Start (Testing on Physical Phone with Expo Go)

1. **Install Expo Go** from Google Play Store (Android) or Apple App Store (iOS).
2. Start the Expo development server:
   ```bash
   cd IndoFleet_PilotApp
   npm start
   ```
3. Scan the QR code displayed in your terminal using:
   - **Android**: Scan inside the **Expo Go** app.
   - **iOS**: Scan with the standard **Camera** app.

---

## 📡 Connecting to the IndoFleet Backend

- The app automatically reads `EXPO_PUBLIC_API_URL` from `.env`.
- For local dev: `http://localhost:5000`
- For cloud production: `https://indo-fleet.onrender.com` (or your production cloud domain).

---

## 🎯 Pilot Workflow

1. **Sortie List**: Select an active order assigned or ready for dispatch.
2. **Pre-flight & Start Flight**: Tap **"START FLIGHT / BROADCAST GPS"**.
   - The app begins continuous background GPS location updates (`expo-location` + `expo-task-manager`).
   - Telemetry packets stream directly to `POST /api/delivery/pilot/update-location`.
   - Web portal (`/track`, Command Center, Copilot HUD) displays real-time live drone motion.
3. **Flight HUD**: Live view of:
   - Ground Speed (km/h)
   - Altitude (meters)
   - Heading / Compass bearing
   - GNSS Satellite latitude / longitude fix
   - Distance remaining to delivery location
   - Battery level (%) & packets transmitted counter
4. **Delivery Handover**: When arrived at destination, tap **"COMPLETE SORTIE / DELIVERED"**, optionally add delivery notes, and confirm.
   - Location streaming automatically pauses and order status updates to `delivered`.

---

## 📦 Building Standalone APK (Android)

To build a standalone APK without Expo Go:
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

# IndoFleet Pilot Telemetry App (React Native + Expo)

Dedicated mobile application for IndoFleet delivery pilots and dispatch agents. Automatically tracks and broadcasts real-time GPS coordinates, speed, altitude, battery percentage, and heading back to the IndoFleet Command Center and Tracking HUD in the foreground and background.

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

- **Local Wi-Fi / LAN**:
  - The app defaults to your local computer IP `http://192.168.21.152:5000`.
  - Ensure your phone and PC are connected to the same Wi-Fi network.
- **Settings Screen**:
  - Tap the **Settings** (⚙️) icon in the top header.
  - Enter your backend URL (e.g. `http://192.168.x.x:5000` or deployed production URL).
  - Tap **Test Ping** to verify connectivity, then tap **Save & Sync**.

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

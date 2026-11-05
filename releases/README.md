# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.2.11 (Build 31 - Turn-by-Turn Google Maps Navigation, Dynamic Wrong-Turn Rerouting, Connection Siren & Auto-Adjustable UI)

- **Version:** 1.2.11 (Build Code 31)
- **Date:** November 05, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a)
- **Package Size:** 54.9 MB (Optimized standalone APK)

### Direct Download Options:
1. **Desktop Direct Build:** `C:\Users\Punit\Desktop\IndoFleet.apk` (also `C:\Users\Punit\Desktop\IndoFleet_v1.2.11.apk`)
2. **Local Direct Build:** `IndoFleet_PilotApp/android/app/build/outputs/apk/release/app-release.apk`
3. **Web Portal Direct Download:** `/api/delivery/download-apk`
4. **Local Release Archive:** `releases/IndoFleet_Delivery_latest.apk` & `releases/IndoFleet_Delivery_v1.2.11.apk`

### What Was Fixed & Added in v1.2.11:
- **Turn-by-Turn Mission Navigation Hub:**
  - Integrated 1-click **"Start Live Navigation in Google Maps"** launching native driving directions (`google.navigation:q=...&mode=d`) with live Indian road traffic and voice guidance.
  - Replaced heavy embedded webview map with clean, high-performance mission telemetry console.
- **Dynamic Wrong-Turn Auto-Rerouting:**
  - Real-time deviation detector (`checkRouteDeviation`) triggers whenever driver drifts $>150\text{m}$ off planned corridor.
  - Automatically recalculates road polyline and pushes new route + recalculated ETA to Admin, Dispatcher, and Customer maps.
- **Connection Lost Driver Siren Alert & Offline Buffer:**
  - Dual-frequency audio siren (820Hz/580Hz) + physical vibration alert whenever driver loses internet or GPS.
  - Offline FIFO breadcrumb buffer in `AsyncStorage` queues coordinates while offline and flushes batch automatically on reconnection.
- **Internal-Only Logo Alert Badge:**
  - Live `DRIVER CONNECTION LOST` pulsing indicator displayed **strictly** next to the system logo for `admin`, `fleet_manager`, and `dispatcher`.
  - Reassuring `ON THE WAY` badge displayed to customers so they never see alarming offline signals.
- **Universal Auto-Adjustable Text & UI Scaling:**
  - Enforced `maxFontSizeMultiplier = 1.25` across all Text and TextInput elements.
  - Automatically scales down on small font settings and scales up gracefully on large accessibility settings without overflowing buttons, badges, or card boundaries.
- **Resilient Media Serving & Stale-While-Revalidate Caching:**
  - Fixed cross-origin media rendering (CORP & CORS headers) so inspection photo evidence and digital proof SVGs load crisp and unblocked.
  - Resolved Supabase statement timeout on order listing with in-flight single-flight promise coalescing and stale-while-revalidate fallback caching.

---

## Previous Releases

### v1.2.6 (Build 26 - Multi-Screen Adaptive Layout, Role-Based Drone QR Security & Robust Dual-Transport Email Service)

- **Version:** 1.2.6 (Build Code 26)
- **Date:** November 04, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a)
- **Package Size:** ~54.9 MB (Optimized standalone APK)

### Direct Download Options:
1. **Desktop Direct Build:** `C:\Users\Punit\Desktop\IndoFleet.apk`
2. **Local Direct Build:** `IndoFleet_PilotApp/android/app/build/outputs/apk/release/app-release.apk`
3. **Web Portal Direct Download:** `/api/delivery/download-apk`
4. **Local Release Archive:** `releases/IndoFleet_Delivery_latest.apk` & `releases/IndoFleet_Delivery_v1.2.6.apk`

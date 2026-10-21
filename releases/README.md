# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.2 (Camera QR Scanner & Auto-Synced Telemetry Build 12)

- **Version:** 1.1.2 (Build Code 12)
- **EAS Build ID:** `b5416662-983b-403a-994c-0ddc0a2d2462`
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.2 Release APK](https://expo.dev/artifacts/eas/nUAvL1XJk-3INzKf9f3To-5WNfP9opTTOxBaOBJLuro.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.2](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.2)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_v1.1.2.apk`](./IndoFleet_Delivery_v1.1.2.apk)

### What Was Fixed & Added in v1.1.2:
- **Dedicated Full-Screen Airframe Inspection & QR Scanner:**
  - Automatically hides BottomNav on scanner and inspection workflows so action buttons ("CONFIRM & VERIFY DRONE QR CODE" and "CONFIRM & COMPLETE DELIVERY") are 100% visible and never clipped or obscured.
- **Auto-Fetched Airframe & Telemetry Battery (Zero Manual Typing):**
  - Replaced manual text inputs with verified digital flight manifest cards showing real Airframe ID (`RPAV-700-01`), Model (`IndoWings 700 RPAV`), and live telemetry battery gauge (`% SOC`).
- **Universal Dual Camera Fallback:**
  - Auto-selects rear environment camera on smartphones and laptops/webcams during testing, with photo snap capability.
- **Synchronized Road Navigation Metrics:**
  - Aligned Total Distance and Remaining/Rest Distance using real OSRM road routing networks with ETA, preventing discrepancies.
- **Clean Map Display:**
  - Stripped floating overlays inside the Leaflet map; moved telemetry and road route metrics outside the map frame into a sleek dashboard card.
- **Direct Email OTP Verification:**
  - Removed all developer CC overrides; OTPs are dispatched strictly and securely to registered recipient emails without auto-fill.

---

## Previous Builds:
- **v1.1.0 (Build 11):** [Download IndoFleet v1.1.0 APK](https://expo.dev/artifacts/eas/b06S-XdlAjc0dYgen3Gnsw8tTY7PmV18fdvo-p5eoLQ.apk)
- **v1.0.9 (Build 10):** [Download IndoFleet v1.0.9 APK](https://expo.dev/artifacts/eas/FhN7Cog8OnzJxlD1hUt9ClHgtI-v4oCe7jZ7w4KoK2k.apk)
- **v1.0.8 (Build 9):** [Download IndoFleet v1.0.8 APK](https://expo.dev/artifacts/eas/XmO7VsncP_WYRUyIU2wnCjYDqAH0I8Y-XEvp2MQcGtc.apk)
- **v1.0.7 (Build 8):** [Download IndoFleet v1.0.7 APK](https://expo.dev/artifacts/eas/-XtYnD21eP4Zd1Na8_0MEfIQ9pExlsXFY5Wf1GLvmfY.apk)
- **v1.0.6 (Build 7):** [Download IndoFleet v1.0.6 APK](https://expo.dev/artifacts/eas/RjApgFBCQTbddWcVeSeec4gA9gKY_KYYH9dFF82ldvo.apk)
- **v1.0.5 (Build 6):** [Download IndoFleet v1.0.5 APK](https://expo.dev/artifacts/eas/45FmrPy4X1RLbnxe-DBzU1KGY3GmWXpx9rOgsCRpWdM.apk)
- **v1.0.4 (Build 5):** [Download IndoFleet v1.0.4 APK](https://expo.dev/artifacts/eas/0yF0EfPlQr3Smcl1xil9WNkxctXN-RlgFbzISD3vRpg.apk)
- **v1.0.3 (Build 4):** [Download IndoFleet v1.0.3 APK](https://expo.dev/artifacts/eas/QDhybN1dGK0ijI2MfKZh_WJcufNuekXHrKx9II1lAWc.apk)

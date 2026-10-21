# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.7 (Multi-Drone Two-Stage Inspection, Fleet Serial Matching, Light Theme UI Overhaul)

- **Version:** 1.1.7 (Build Code 17)
- **EAS Build ID:** `0edbb218-cebb-42ff-b08c-c61088c979d5`
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.7 Release APK](https://expo.dev/artifacts/eas/8NdM80FyCbuKx_pfNlxdzm0wFkAz2aZwp4iyrE04jtA.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.7](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.7)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_v1.1.7.apk`](./IndoFleet_Delivery_v1.1.7.apk)
4. **Latest Link:** [`releases/IndoFleet_Delivery_latest.apk`](./IndoFleet_Delivery_latest.apk)

### What Was Fixed & Added in v1.1.7:
- **Two-Stage Multi-Drone Inspection Flow:**
  - **Stage 1 (Hub Pre-Acceptance):** Delivery partner inspects propellers, payload bay, and battery voltage for all booked drones before accepting the order. No customer OTP is required at the hub.
  - **Stage 2 (Customer Handover):** At customer destination, pilot performs handover inspection, captures POD photo, and enters Customer + Partner OTP to finalize delivery.
  - Drones are displayed in a clean sortie slot card list, tracking inspection state for each individual unit.
- **Authentic Fleet Drone Serial QR Verification:**
  - Enhanced `/api/delivery/pilot/verify-drone-order` backend route resolving against the complete fleet database. Matches both drone unit ID and manufacturing serial numbers (`IW-700RPAV-2026-XXXX`).
  - Strict red mismatch error displays if an aircraft belonging to a different order is scanned.
- **Complete Dark Theme to Light Theme Overhaul:**
  - Converted Radar GPS Tracking modal to clean white theme (`bg-white`, slate-50 telemetry gauges, indigo/emerald accents).
  - Converted Customer Delivery Live Map fallback from pitch-black box to clean white card with road route navigation from Central Hub Noida.
  - Converted Pilot App scanner viewport and camera placeholder to high-contrast `#F8FAFC` light theme.
- **Admin Dispatch History Authorization Fix:**
  - Added authorization headers to order and drone fetches, populating live consignments into the Dispatch History table.

---

## Previous Builds:
- **v1.1.5 (Build 15):** [Download IndoFleet v1.1.5 APK](https://expo.dev/artifacts/eas/RM4izCdJkVINYAKjKwzUUQQzv7p4yPdKeI-Pl_sJNB4.apk)
- **v1.1.4 (Build 14):** [Download IndoFleet v1.1.4 APK](https://expo.dev/artifacts/eas/cIUHLk91xKvnC-lJZ15FT4bnqr_DT3Ezbs9y-bsj58o.apk)
- **v1.1.3 (Build 13):** [Download IndoFleet v1.1.3 APK](https://expo.dev/artifacts/eas/iKonz1CfUngHuZU-A0xPVfeJYCv7JUZIK2LWzmMuQzc.apk)
- **v1.1.2 (Build 12):** [Download IndoFleet v1.1.2 APK](https://expo.dev/artifacts/eas/nUAvL1XJk-3INzKf9f3To-5WNfP9opTTOxBaOBJLuro.apk)
- **v1.1.0 (Build 11):** [Download IndoFleet v1.1.0 APK](https://expo.dev/artifacts/eas/b06S-XdlAjc0dYgen3Gnsw8tTY7PmV18fdvo-p5eoLQ.apk)
- **v1.0.9 (Build 10):** [Download IndoFleet v1.0.9 APK](https://expo.dev/artifacts/eas/FhN7Cog8OnzJxlD1hUt9ClHgtI-v4oCe7jZ7w4KoK2k.apk)
- **v1.0.8 (Build 9):** [Download IndoFleet v1.0.8 APK](https://expo.dev/artifacts/eas/XmO7VsncP_WYRUyIU2wnCjYDqAH0I8Y-XEvp2MQcGtc.apk)
- **v1.0.7 (Build 8):** [Download IndoFleet v1.0.7 APK](https://expo.dev/artifacts/eas/-XtYnD21eP4Zd1Na8_0MEfIQ9pExlsXFY5Wf1GLvmfY.apk)
- **v1.0.6 (Build 7):** [Download IndoFleet v1.0.6 APK](https://expo.dev/artifacts/eas/RjApgFBCQTbddWcVeSeec4gA9gKY_KYYH9dFF82ldvo.apk)
- **v1.0.5 (Build 6):** [Download IndoFleet v1.0.5 APK](https://expo.dev/artifacts/eas/45FmrPy4X1RLbnxe-DBzU1KGY3GmWXpx9rOgsCRpWdM.apk)
- **v1.0.4 (Build 5):** [Download IndoFleet v1.0.4 APK](https://expo.dev/artifacts/eas/0yF0EfPlQr3Smcl1xil9WNkxctXN-RlgFbzISD3vRpg.apk)
- **v1.0.3 (Build 4):** [Download IndoFleet v1.0.3 APK](https://expo.dev/artifacts/eas/QDhybN1dGK0ijI2MfKZh_WJcufNuekXHrKx9II1lAWc.apk)

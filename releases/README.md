# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.2.1 (Local Standalone Release APK, In-Memory Telemetry Cache, Supabase DB Sync & Interactive Re-Verify)

- **Version:** 1.2.1 (Build Code 21)
- **Date:** October 22, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)
- **Package Size:** ~100.7 MB

### Direct Download Options:
1. **Local Direct Build:** `IndoFleet_PilotApp/android/app/build/outputs/apk/release/app-release.apk`
2. **Web Portal Direct Download:** `/api/delivery/download-apk`
3. **Local Release Archive:** `releases/IndoFleet_Delivery_latest.apk` & `releases/IndoFleet_Delivery_v1.2.1.apk`

### What Was Fixed & Added in v1.2.1:
- **Local Standalone Production Release APK:**
  - Full native Android release build compiled directly on-machine using Gradle 9.3.1 and OpenJDK 17.
  - Pre-compiled Hermes bytecode for instant startup, zero debug overlays, and smooth 60fps animations.
- **In-Memory RAM Cache:**
  - 98.2% latency drop on fleet fetching (`/api/delivery/fleet` reduced from 8,468ms to 148ms).
- **Bulletproof Drone Verification & Re-verification:**
  - Removed custom schema column collisions and safely encapsulated drone assignments into `delivery_data` JSONB.
  - Interactive "Re-verify" action across Sortie, QR Scanner, and Inspection screens.
- **Responsive Web & Mobile Overhauls:**
  - Modernized Live Tracking Map with collapsible mini-HUD and 100% full-map view toggle.
  - Fixed mobile button wrapping on Admin Dashboard and Fleet Manager.

---

## Previous Builds:
- **v1.2.0 (Build 20):** [Download IndoFleet v1.2.0 Release APK](https://expo.dev/artifacts/eas/ky_DWar8qpMmInwY2aYzMC9ZibSC48cc5GJcsAbt-bA.apk)
- **v1.1.9 (Build 19):** [Download IndoFleet v1.1.9 APK](https://expo.dev/artifacts/eas/M-Za3pWi-ZageaWq6gSA00M0wYa5maSz_tHeiKeBp1c.apk)
- **v1.1.8 (Build 18):** [Download IndoFleet v1.1.8 APK](https://expo.dev/artifacts/eas/8NdM80FyCbuKx_pfNlxdzm0wFkAz2aZwp4iyrE04jtA.apk)
- **v1.1.7 (Build 17):** [Download IndoFleet v1.1.7 APK](https://expo.dev/artifacts/eas/8NdM80FyCbuKx_pfNlxdzm0wFkAz2aZwp4iyrE04jtA.apk)
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

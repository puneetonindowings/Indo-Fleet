# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.2.4 (Build 24 - Android Navigation Insets Fix, Silent Local Fallback & Order-Wise Inspection Console)

- **Version:** 1.2.4 (Build Code 24)
- **Date:** October 22, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a)
- **Package Size:** ~54.9 MB (Retains 48% size reduction)

### Direct Download Options:
1. **Local Direct Build:** `IndoFleet_PilotApp/android/app/build/outputs/apk/release/app-release.apk`
2. **Web Portal Direct Download:** `/api/delivery/download-apk`
3. **Local Release Archive:** `releases/IndoFleet_Delivery_latest.apk` & `releases/IndoFleet_Delivery_v1.2.4.apk`
4. **GitHub Official Release:** [v1.2.4 Release](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.2.4)

### What Was Fixed & Added in v1.2.4:
- **Android System Navigation Bar Insets Fix:**
  - Disabled `edgeToEdgeEnabled=false` in `gradle.properties` and added 24dp Android safe padding to prevent bottom navigation tabs from being occluded behind Android 3-button system navigation controls (Back / Home / App Switcher).
- **Silent Multi-Layer OTP & API Fallback:**
  - Added seamless background fallback in `api.ts` from Render cloud (`indo-fleet.onrender.com`) to local backend (`localhost:5000` / `10.0.2.2:5000`) for OTP dispatch and inspection logs without showing any dummy or test alert banners.
- **Order-Wise Grouped Drone Inspection Console:**
  - Refactored Admin Drone Audit Log Console (`DroneAuditLogConsole.tsx`) from a confusing flat list into clean, collapsible Order cards.
  - Consignment drones are grouped per order with consolidated multi-drone status badges.
- **Interactive Inspection Media Evidence:**
  - Integrated high-resolution photo and video playback lightboxes directly in the Admin Console to view pre/post-flight drone inspections with captured timestamps and checklists.
- **Retained Compact Size (~54.9 MB):**
  - Built with `arm64-v8a` + `armeabi-v7a` architecture filtering, preserving the 48% size optimization.

---

## Previous Builds:
- **v1.2.3 (Build 23):** [Local Release Archive] (`releases/IndoFleet_Delivery_v1.2.3.apk`) - 48% size reduction, multi-drone persistence, video recording evidence.
- **v1.2.2 (Build 22):** [Local Release Archive] (`releases/IndoFleet_Delivery_v1.2.2.apk`)
- **v1.2.1 (Build 21):** [Local Release Archive] (`releases/IndoFleet_Delivery_v1.2.1.apk`)
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

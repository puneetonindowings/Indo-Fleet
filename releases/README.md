# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.9 (Permanent Database Persistence, Zero Hindi UI, Professional English Templates & Camera HUD Reticle)

- **Version:** 1.1.9 (Build Code 19)
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.9 Release APK](https://expo.dev/artifacts/eas/M-Za3pWi-ZageaWq6gSA00M0wYa5maSz_tHeiKeBp1c.apk)
2. **EAS Build Dashboard:** [IndoFleet Delivery v1.1.9 Build 19](https://expo.dev/accounts/puneet-indowingss-team/projects/indofleet-delivery/builds/4cd62e6d-6eae-4d3a-a5df-a42775d4cf54)
3. **GitHub Release Tag:** [GitHub Release v1.1.9](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.9)

### What Was Fixed & Added in v1.1.9:
- **Bulletproof DB Persistence for Drone Verifications & Inspections:**
  - Resolved serialization bug in `deliveryStore.ts` where inspected drone IDs were omitted from top-level order columns.
  - Multi-stage inspections (Hub Pre-Acceptance, In-Flight Transit, Customer Delivery) now permanently persist to Supabase PostgreSQL.
  - Retains verified status across phone restarts, cache clears, and browser sessions.
- **Zero Hindi & 100% Professional Corporate English:**
  - Removed all Devanagari subtitles and parentheses across inspection consoles and action triggers.
  - Rewrote transactional email copy (including account provisioning and OTP verification) to corporate enterprise English.
- **Enhanced Camera Viewfinder & Reticle Alignment:**
  - Replaced milky-white overlay with a transparent HUD reticle with emerald corner targets.
  - Fixed mobile browser shutter integration (`accept="image/*" capture="environment"`).
  - Responsive order cards with flex wrapping preventing badge overflow.

---

## Previous Builds:
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

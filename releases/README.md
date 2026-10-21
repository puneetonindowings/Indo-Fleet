# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.8 (Error-Proof Drone QR Verification, Resilient Multi-Drone Matching & Exact QR Allocation)

- **Version:** 1.1.8 (Build Code 18)
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.8 Release APK](https://expo.dev/artifacts/eas/8NdM80FyCbuKx_pfNlxdzm0wFkAz2aZwp4iyrE04jtA.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.8](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.8)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_latest.apk`](./IndoFleet_Delivery_latest.apk)

### What Was Fixed & Added in v1.1.8:
- **Error-Proof Airframe QR Validation (Zero Mismatch Failures):**
  - Scanned QR codes now extract Clean Drone IDs regardless of formatting: raw airframe serials (`INW-700RPAV-0004`), manufacturing serials (`IW-700RPAV-2026-0004`), URLs (`https://.../drone/INW-700RPAV-0004`), or JSON payloads.
  - Multi-tier matching logic: immediate zero-latency local matching against order's reserved drones, intelligent 4-digit unit index matching (`0004`), dynamic live order refresh fallback, and backend fleet resolution.
  - Safe error handling: non-JSON responses from cold servers do not cause parsing crashes.
- **Strict Order Drone Allocation (Exact 2 QRs for 2-Drone Order):**
  - Eliminated phantom 3rd QR code generation caused by pilot vehicles/emails polluting order drone fields.
  - Multi-drone orders now strictly output the exact booked drones in the downloaded QR ZIP (e.g. 2 drones = exactly 2 QRs).
- **Pure Light Theme Scanner UI:**
  - Viewfinder, camera cards, reticle guides, and mismatch warning cards styled in high-contrast light theme with crisp borders and clean typography.

---

## Previous Builds:
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

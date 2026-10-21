# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.5 (Strict Drone Matching & Mismatch Error, Pre-Scan Hiding, No Dummy Verification)

- **Version:** 1.1.5 (Build Code 15)
- **EAS Build ID:** `aa7798f1-0f39-4333-933a-7f93d8d875d9`
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.5 Release APK](https://expo.dev/artifacts/eas/RM4izCdJkVINYAKjKwzUUQQzv7p4yPdKeI-Pl_sJNB4.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.5](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.5)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_v1.1.5.apk`](./IndoFleet_Delivery_v1.1.5.apk)

### What Was Fixed & Added in v1.1.5:
- **Strict Drone Airframe QR Matching & Mismatch Error Modal:**
  - When scanning any QR code or entering a drone serial, the app checks against the drone assigned to that specific order.
  - If a wrong drone is scanned, an unmistakable **Red Mismatch Error Alert** blocks progression, showing both the scanned ID and expected assigned ID.
  - Only when the physical QR code on the drone matches the assigned drone will the app unlock Pre-Flight Inspection.
- **Pre-Scan Drone ID Security Hiding:**
  - Before scanning, the drone ID and model are **completely hidden**. The pilot only sees their Order ID (`Order #IW-...`), preventing premature leakage or guessing.
- **Removed Fake/Dummy "Instant Verify":**
  - Completely removed the dummy "Instant Verify" bypass button. Verification is now 100% authentic through the real optical laser scanner, mobile camera photo capture, gallery upload, or physical serial number matching.
- **Enhanced Mobile Camera Hardware Autofocus & jsQR Engine:**
  - Bundled pure client-side `jsQR` engine for instant QR decoding directly from live video frames and photographed snapshots.

---

## Previous Builds:
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

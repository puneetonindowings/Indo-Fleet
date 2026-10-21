# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.4 (In-App Camera HUD, Airframe Inspection Light Mode, Auto Acceptance OTP & Anchored Route)

- **Version:** 1.1.4 (Build Code 14)
- **EAS Build ID:** `54b2c216-547a-4411-8259-168f587c552f`
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.4 Release APK](https://expo.dev/artifacts/eas/cIUHLk91xKvnC-lJZ15FT4bnqr_DT3Ezbs9y-bsj58o.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.4](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.4)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_v1.1.4.apk`](./IndoFleet_Delivery_v1.1.4.apk)

### What Was Fixed & Added in v1.1.4:
- **In-App QR Scanner HUD & Viewfinder:**
  - Removed intrusive OS photo shutter popup on screen entry.
  - Added dedicated high-tech HUD scanner viewfinder with live laser targeting animation and manual code verification fallback.
  - Automatically verifies drone QR codes and triggers instant transition to the Pre-Flight Inspection screen upon match.
- **Dedicated Camera & Video Airframe Verification Modal:**
  - Replaced erratic system file picker popups with an interactive in-app camera modal.
  - Supports live snapshot capture, live video recording with real-time timer, and reliable HTML5/native gallery uploads.
  - Clear visual badges and responsive image/video preview thumbnails that persist across the inspection flow.
- **Consistent Clean Light Theme:**
  - Standardized `QrScannerScreen` and `InspectionScreen` into a unified enterprise light aesthetic (`#FFFFFF`, `#F8FAFC`, `#5A00B8`, slate typography).
- **Auto-Trigger Acceptance OTP with Live Status:**
  - Opening the order acceptance modal automatically triggers the dispatch of the 6-digit acceptance OTP to the pilot's email.
  - Displays dynamic live feedback ("Dispatching..." -> "✓ Dispatched to pilot email"), a 30s resend cooldown countdown, and a 1-tap dev autofill pill for effortless local testing.
- **Anchored Pilot Origin & Expressway Delivery Geocoding:**
  - Eliminated ISP broadband IP gateway fallback (`ipapi.co`) which previously caused routes to snap north to Delhi (`28.6668`).
  - Anchored pilot origin strictly at IndoFleet Hub Sector 60 (`28.6037, 77.3661`).
  - Added Noida sector address geocoding (`Sector 148` -> `28.4779, 77.4815`), rendering the authentic ~20 km expressway route down the Noida-Greater Noida Expressway.

---

## Previous Builds:
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

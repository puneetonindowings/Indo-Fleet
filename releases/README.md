# IndoFleet Delivery Mobile App - Android Releases

## Latest Release: v1.1.3 (Full UX Enhancements, Back Routing & Emergency Audio Build 13)

- **Version:** 1.1.3 (Build Code 13)
- **EAS Build ID:** `8d9682be-9e3d-47fe-9546-534aa4b93623`
- **Date:** October 21, 2026
- **Architecture:** Android (arm64-v8a, armeabi-v7a, x86_64)

### Direct Download Links:
1. **Direct High-Speed Expo CDN:** [Download IndoFleet v1.1.3 Release APK](https://expo.dev/artifacts/eas/iKonz1CfUngHuZU-A0xPVfeJYCv7JUZIK2LWzmMuQzc.apk)
2. **GitHub Release Tag:** [GitHub Release v1.1.3](https://github.com/puneetonindowings/Indo-Fleet/releases/tag/v1.1.3)
3. **Repository Binary:** [`releases/IndoFleet_Delivery_v1.1.3.apk`](./IndoFleet_Delivery_v1.1.3.apk)

### What Was Fixed & Added in v1.1.3:
- **Delivery Person Web Portal App Download Center:**
  - Added dedicated **"Download Pilot App"** tab with `v1.1.3` badge in profile sidebar and top navigation dropdown for delivery roles (`Akanksha Mishra`).
  - Added instant Mobile Download QR Code for direct over-the-air installation.
- **Android Physical/Gesture Back Button Step-by-Step Routing:**
  - Phone hardware back button now gracefully steps back through screen history (`Scanner` ➡️ `Radar` ➡️ `Dashboard`) instead of unexpectedly killing the application.
  - Automatically dismisses active modals first, exits fullscreen map before leaving the screen, and requires a double-tap on Dashboard with toast to prevent accidental exits.
- **Small Non-Fullscreen Map Rendering Fix:**
  - Fixed mobile WebView container collapsing in vertical ScrollView. Small map renders Leaflet tiles immediately via explicit height, nested scroll enabling, and automatic `ResizeObserver` size invalidations without requiring maximize.
- **Real-Time Camera QR Code Viewfinder:**
  - Guaranteed camera launch on native Android APK and web browsers, auto-detects QR codes with `BarcodeDetector`, and features manual verify fallback.
- **Emergency SOS Ambient Audio & Precision GPS:**
  - Normalized audio encoding to valid `data:audio/mp4;base64` resolving the `0:00 / 0:00` player freeze in the Admin Portal.
  - Integrated device fused location provider (`getLastKnownPositionAsync`) for instantaneous physical GPS capture with IP fallback.

---

## Previous Builds:
- **v1.1.2 (Build 12):** [Download IndoFleet v1.1.2 APK](https://expo.dev/artifacts/eas/nUAvL1XJk-3INzKf9f3To-5WNfP9opTTOxBaOBJLuro.apk)
- **v1.1.0 (Build 11):** [Download IndoFleet v1.1.0 APK](https://expo.dev/artifacts/eas/b06S-XdlAjc0dYgen3Gnsw8tTY7PmV18fdvo-p5eoLQ.apk)
- **v1.0.9 (Build 10):** [Download IndoFleet v1.0.9 APK](https://expo.dev/artifacts/eas/FhN7Cog8OnzJxlD1hUt9ClHgtI-v4oCe7jZ7w4KoK2k.apk)
- **v1.0.8 (Build 9):** [Download IndoFleet v1.0.8 APK](https://expo.dev/artifacts/eas/XmO7VsncP_WYRUyIU2wnCjYDqAH0I8Y-XEvp2MQcGtc.apk)
- **v1.0.7 (Build 8):** [Download IndoFleet v1.0.7 APK](https://expo.dev/artifacts/eas/-XtYnD21eP4Zd1Na8_0MEfIQ9pExlsXFY5Wf1GLvmfY.apk)
- **v1.0.6 (Build 7):** [Download IndoFleet v1.0.6 APK](https://expo.dev/artifacts/eas/RjApgFBCQTbddWcVeSeec4gA9gKY_KYYH9dFF82ldvo.apk)
- **v1.0.5 (Build 6):** [Download IndoFleet v1.0.5 APK](https://expo.dev/artifacts/eas/45FmrPy4X1RLbnxe-DBzU1KGY3GmWXpx9rOgsCRpWdM.apk)
- **v1.0.4 (Build 5):** [Download IndoFleet v1.0.4 APK](https://expo.dev/artifacts/eas/0yF0EfPlQr3Smcl1xil9WNkxctXN-RlgFbzISD3vRpg.apk)
- **v1.0.3 (Build 4):** [Download IndoFleet v1.0.3 APK](https://expo.dev/artifacts/eas/QDhybN1dGK0ijI2MfKZh_WJcufNuekXHrKx9II1lAWc.apk)

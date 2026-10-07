# 📋 IndoWings OTP Restoration Blueprint & Checklist

Yeh document un sabhi jagahon ki poori list aur details rakhta hai jahan se humne temporarily **OTP verification** ko bypass/remove kiya hai. Jab Nodemailer ya SMS gateway integrate ho jayega, hum step-by-step yahan se restore kar sakte hain.

---

## 1. 🖥️ Frontend Files & Locations

### A. Login Flow (`IndoWings_Frontend/src/pages/LoginPage.tsx`)
- **What was changed**:
  - Direct password-based authentication `/api/delivery/auth/login` activate kiya gaya hai (bina OTP requirement ke).
  - Button text `"Request OTP & Sign In"` ko `"Sign In to Portal"` me badla gaya.
  - Role-based auto-routing enable kiya gaya.
- **Where to re-enable OTP**:
  - `handleSendOtp` / `handleVerifyOtp` toggle buttons for instant 6-digit email/mobile OTP login.

---

### B. Admin Dashboard (`IndoWings_Frontend/src/pages/AdminDashboardPage.tsx`)
- **What was changed**:
  1. **Add Member Modal (`showAddMemberModal`)**:
     - Step 2 OTP verification input box ko remove kiya gaya (ab direct single-step creation hota hai).
  2. **Add Single Drone Modal (`showAddDroneModal`)**:
     - Admin 6-digit OTP confirmation field ko bypass kiya gaya.
  3. **Bulk Drone Fleet Provisioning Modal (`showBulkDroneModal`)**:
     - High-security OTP challenge ko bypass kiya gaya.
  4. **Edit / Delete Drone Modal (`editingDrone`)**:
     - Operational OTP confirmation ko bypass kiya gaya.
- **Where to re-enable OTP**:
  - Modal form submit ke time `adminOtp` dialog open karke 6-digit code mangna aur backend ko payload me `{ admin_otp: '...' }` bhejna.

---

### C. Profile & Settings (`IndoWings_Frontend/src/pages/ProfilePage.tsx`)
- **What was changed**:
  - Email aur Mobile inputs se `Verify with Email OTP` aur `Verify with SMS OTP` badges/buttons ko hide/clean kiya gaya.
  - Direct profile save allow kiya gaya.
- **Where to re-enable OTP**:
  - `handleTriggerVerify('email', email)` aur `handleTriggerVerify('phone', phone)` ke buttons ko inputs ke upar wapas show karna.
  - 6-digit OTP verify modal (`otpModalTarget`) ko active karna.

---

## 2. ⚙️ Backend API Endpoints (`IndoWings-Backend/src/routes/delivery.ts`)

### A. Admin Protected Routes (`verifyAdminOtp` Middleware)
- **Current Status**:
  - `verifyAdminOtp` middleware me optional bypass laga diya hai (agar OTP nahi aata ya bypass flag hai to proceed karta hai).
- **Affected Endpoints**:
  1. `POST /api/delivery/admin/provision-user` (Team member creation)
  2. `POST /api/delivery/admin/drones` (Single Drone addition)
  3. `POST /api/delivery/admin/drones/bulk` (Bulk 50-1000 Drones addition)
  4. `PUT /api/delivery/admin/drones/:id` (Drone modification)
  5. `DELETE /api/delivery/admin/drones/:id` (Drone decommissioning)

### B. OTP Service Handlers
- **Endpoints to connect to Nodemailer**:
  1. `POST /api/delivery/auth/request-otp` (Generate and send 6-digit code via Nodemailer SMTP)
  2. `POST /api/delivery/auth/verify-otp` (Validate OTP against cached/stored code in DB)
  3. `POST /api/delivery/profile/send-verify-otp` (For email & phone profile validation)
  4. `POST /api/delivery/profile/verify-otp` (Mark `is_email_verified = true` in DB)

---

## 3. 🚀 Nodemailer Integration Quick Steps (When Ready)

Jab aap Nodemailer credentials provide karenge:
1. `IndoWings-Backend` me Nodemailer transporter setup karenge:
   ```ts
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: Number(process.env.SMTP_PORT) || 587,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   });
   ```
2. OTP emails ke liye clean IndoWings HTML template attach karenge.
3. Upar diye gaye teeno frontend pages (`LoginPage`, `AdminDashboardPage`, `ProfilePage`) aur backend endpoints me OTP verification ko 1-by-1 reactivate kar denge.

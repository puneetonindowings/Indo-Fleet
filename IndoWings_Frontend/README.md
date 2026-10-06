# IndoWings Aerial Logistics - Frontend Web Application

Modern autonomous drone delivery and logistics command center built with React, TypeScript, Vite, Tailwind CSS, and Lucide Icons.

## Environment Variables (.env)

Create a `.env` file in the root of the `client` directory with the following variables:

```env
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_MAPTILER_KEY=your_maptiler_key
```

## Features
- **Live Drone Tracking**: Real-time GPS flight simulation, altitude, speed gauges, and interactive radar map.
- **Flight Dispatch & Order Booking**: Instant multi-point corridor routing, aerial distance calculation, and Razorpay integration.
- **AI Copilot & Tracking Chatbot**: Integrated customer support assistant with OTP verification (Twilio SMS & Email) and instant live telemetry HUD.
- **Fleet Showcase**: Specifications and DGCA certifications for Cyberone Pro, Cyberone Max, Cyberone Lite, and S-500 VTOL.
- **Customer & Admin Dashboards**: Order history, live flight cancellation, feedback system, and operations consultations.
- **Customer Drone Store**: Admin-provisioned customers browse available inventory, add drones to a cart, save delivery addresses, book without online payment, and track orders.
- **Delivery Map**: MapTiler maps order coordinates when available; live carrier GPS is not connected.

## Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Maps & UI**: MapLibre GL with MapTiler styles; custom radar and telemetry HUDs

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and add your provider keys:
```bash
cp .env.example .env.local
```
Restrict the MapTiler key to the frontend domains where the app is hosted.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm run preview
```

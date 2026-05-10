# Med Rep Management System 🏥

A professional mobile application designed for Medical Representatives to manage attendance, doctor visits, and daily planning with automated geofencing and offline synchronization.

## 🚀 Quick Start

### 1. Open the Project
Open this folder in **VS Code**:
`C:\Users\Ibrahim\.gemini\antigravity\scratch\Med_Rep-main\Med_Rep-main`

### 2. Install Dependencies
Open the terminal in VS Code and run:
```bash
npm install
```

### 3. Run the Application
Start the Expo development server:
```bash
npx expo start
```
*   Scan the **QR Code** using the **Expo Go** app on your phone.
*   Ensure your phone is on the **same Wi-Fi network** as your computer.

---

## 🛠 Key Features

*   **Silent Attendance**: Automated check-in/out logic with background geofencing (validates location against assigned base).
*   **Doctor Management**: Comprehensive list of doctors with search and priority filtering.
*   **Planning System**: Create and manage visit plans with date-range selection.
*   **Local Database**: Powered by `expo-sqlite` for robust offline data storage.
*   **State Management**: Centralized logic using Redux Toolkit.
*   **Premium UI**: Modern, high-performance interface with silent GPS indicators.

---

## 📂 Project Structure

- **`/app`**: Expo Router screens (Login, Home, Attendance, Plans, Doctors).
- **`/database`**: SQLite services, schema initialization, and data helpers.
- **`/redux`**: Global state management (Auth, Attendance, Settings).
- **`/components`**: Reusable UI elements (Cards, Modals, Buttons).
- **`/utils`**: Helper functions for Geolocation, Colors, and Formatting.

---

## 🛡 Security & Privacy

*   **Location Privacy**: All GPS validation happens locally on the device or via secure background requests.
*   **Data Integrity**: SQLite prevents data loss in areas with poor internet connectivity.

---

**Developed for the Med Rep Final Product Variant.**

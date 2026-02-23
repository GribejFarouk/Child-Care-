# ChildCare+ : Step 1 Design & Maquette Specification

## 1. Design System & Branding
*   **Theme:** Clinical & Clean.
    *   *Primary Colors:* Trustworthy Blues (e.g., Tailwind `blue-600`), Crisp White (`white`), Light Grays (`gray-50` to `gray-200` for backgrounds/borders).
*   **Typography:** Clean & Modern sans-serif (e.g., Inter, Roboto, or Poppins).
*   **Language:** French (Primary/Default), with architecture planned for future i18n (English, Arabic).
*   **Display Mode:** Light Mode only (MVP).
*   **Platform:** Responsive Web App / PWA (Optimized for both Desktop Browser and Mobile Install).

## 2. Core Navigation & Layout
*   **Global Navigation:** Hamburger Menu that opens a Sidebar (used across both Mobile and PC).
*   **Primary Action:** A prominent Floating Action Button (FAB) on the Dashboard to quickly "Add Measurement".

## 3. User Flow & Screen Specifications

### A. Public Flow
1.  **Landing Page:** Full marketing page explaining ChildCare+ features. Includes a clear "Commencer" (Get Started) call-to-action.
2.  **Auth Pages (Login / Sign Up):** Simple Email & Password forms. No strict password validation for MVP (just non-empty).

### B. Onboarding Flow (Post-Login)
1.  **Medical Disclaimer Modal:** A mandatory popup on the *very first login*. Must state clearly in French that the app is a supportive tool and does not replace a pediatrician's diagnosis. Must be explicitly accepted to proceed.
2.  **Profile Setup:** A sequential form to collect:
    *   Parent/User Information.
    *   Child Information (MVP fields: Nom, Date de naissance, Sexe).

### C. Main App Flow
1.  **Dashboard:** 
    *   Displays rich mock data (a parent with multiple children of different ages).
    *   Shows high-level summaries, recent alerts, and quick access to growth charts.
    *   Contains the FAB for adding new measurements.
2.  **Sidebar Menu:** Links to Dashboard, Children Profiles, Pregnancy Tracker, Alerts, and Settings.

## 4. Mock Data Requirements (For Design Context)
*   The UI must be designed to accommodate multiple children cards/widgets simultaneously.
*   Names, dates, and measurements should look realistic (e.g., "Léo, 14 mois, 10.2 kg").
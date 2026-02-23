# ChildCare+ Phase 1 Execution Plan: Maquette, Sequence Diagrams & MVP Frontend

## 1. Phase 1 Objective Summary
**Goal:** Deliver a fully navigable, responsive, and visually complete frontend prototype of ChildCare+ powered entirely by mock data, alongside foundational system design artifacts. 
**Definition of "Phase 1 Done":** All required screens are built in React/Tailwind, linked via routing, populated with realistic mock data, and accompanied by finalized UI maquettes and 5 core sequence diagrams. The application must clearly display medical disclaimers emphasizing it is a supportive tool, not a diagnostic one.

---

## 2. Major Workstreams

### Workstream A: Maquettes (UI/UX Design)
*   **Tasks (Execution Order):**
    1. Define color palette, typography, and core UI components (buttons, inputs, cards).
    2. Draft low-fidelity wireframes for mobile and desktop.
    3. Design high-fidelity mockups for Auth screens (Landing, Login, Sign Up).
    4. Design Dashboard and Navigation (Sidebar/Bottom bar).
    5. Design Data Entry screens (Add Measurement, OCR Import).
    6. Design Visualization screens (Growth Charts, Pregnancy Tracker).
    7. Design auxiliary screens (Alerts, Settings, Child Profile).
    8. Integrate "Consult a Doctor" medical disclaimers into relevant screens (Alerts, Charts).
*   **Estimated Effort:** 4-5 Days
*   **Definition of Done:** High-fidelity designs for all 10+ screens exist, reviewed for mobile responsiveness, and include required medical disclaimers.

### Workstream B: Sequence Diagrams (PlantUML)
*   **Tasks (Execution Order):**
    1. Setup PlantUML environment/plugin.
    2. Draft Diagram 1: User Authentication (Login/Register).
    3. Draft Diagram 2: Manual Measurement Entry & Validation.
    4. Draft Diagram 3: OCR Measurement Import Process.
    5. Draft Diagram 4: Growth Chart Generation & Data Retrieval.
    6. Draft Diagram 5: Alert Generation (Threshold breach).
*   **Estimated Effort:** 2-3 Days
*   **Definition of Done:** 5 PlantUML files (`.puml`) created, rendered to PNG, and validated against the checklist.

### Workstream C: MVP Frontend (React + Mock Data)
*   **Tasks (Execution Order):**
    1. Initialize React project (Vite recommended) + Tailwind CSS.
    2. Setup folder structure and React Router.
    3. Create `src/data/mockData.js` with realistic JSON structures.
    4. Build shared UI components (Navbar, Sidebar, Buttons, Modals).
    5. Implement screens sequentially (see Build Order below).
    6. Integrate Recharts for Growth Charts using mock data.
    7. Implement responsive design tweaks (Mobile-first approach).
*   **Estimated Effort:** 10-14 Days
*   **Definition of Done:** All screens implemented, navigable without errors, responsive on mobile/desktop, displaying mock data accurately.

---

## 3. Week-by-Week Plan (4-Week Sprint)

*   **Week 1: Design & Architecture**
    *   *Outputs:* All UI Maquettes completed. PlantUML environment setup. React project initialized with Tailwind and folder structure.
*   **Week 2: Foundation & Auth**
    *   *Outputs:* 5 Sequence Diagrams completed. `mockData.js` populated. Shared components built. Landing, Sign Up, Login, Forgot Password, and base Dashboard layout implemented.
*   **Week 3: Core Features & Data Visualization**
    *   *Outputs:* Child Profile, Add/Edit Measurement forms, Pregnancy Tracker, and Growth Charts (using Recharts) implemented and linked.
*   **Week 4: Advanced Features & Polish**
    *   *Outputs:* Alerts Center, OCR Import UI (mocked upload/processing state), Settings. Final quality assurance, mobile responsiveness checks, and Phase 1 sign-off.

---

## 4. Frontend Build Order

Execute the frontend development in this exact sequence to ensure dependencies (like navigation and layout) are built before the content that relies on them:

1.  **Auth Flow:** Landing Page $\rightarrow$ Sign Up $\rightarrow$ Login $\rightarrow$ Forgot Password.
2.  **Core Layout:** Dashboard Shell (Sidebar/Navbar/Mobile Menu).
3.  **Entity Management:** Child Profile (List and Detail views).
4.  **Data Entry:** Add/Edit Measurement (Forms with validation UI).
5.  **Specialized Tracking:** Pregnancy Tracker (Timeline/Milestone UI).
6.  **Visualization:** Growth Charts (Integrating Recharts with WHO standard mock data).
7.  **Notifications:** Alerts Center (List of warnings/tips with medical disclaimers).
8.  **Advanced UI:** OCR Import (Drag & drop zone, loading spinner, mock result confirmation).
9.  **Configuration:** Settings (User preferences, theme toggle if applicable).

---

## 5. MVP Architecture Decisions

*   **Folder Structure:**
    ```text
    src/
    ├── assets/        # Images, icons, global CSS
    ├── components/    # Shared UI (Button, Card, Modal, Navbar)
    ├── data/          # mockData.js (Centralized mock database)
    ├── layouts/       # AuthLayout, DashboardLayout
    ├── pages/         # Page components matching the Build Order
    ├── routes/        # React Router configuration
    └── utils/         # Helper functions (date formatting, BMI calc)
    ```
*   **Routing Strategy:** Use `react-router-dom`. Separate routes into Public (Auth) and Private (Dashboard, Profiles). Use Layout components to wrap nested routes.
*   **Shared Components:** Build dumb/stateless components early (e.g., `<PrimaryButton>`, `<DataCard>`, `<FormInput>`) to ensure UI consistency and speed up page development.
*   **Mock Data Strategy:** Create a robust `src/data/mockData.js` exporting objects/arrays for `currentUser`, `children`, `measurements`, `alerts`, and `pregnancyData`. Components should import this data directly to simulate API calls (optionally wrap in `setTimeout` to simulate network latency for loading states).

---

## 6. Sequence Diagram Production Plan

**Order of Creation:**
1.  `seq_auth.puml`: User Registration & Login.
2.  `seq_add_measurement.puml`: User adds measurement $\rightarrow$ System validates $\rightarrow$ System checks thresholds $\rightarrow$ System saves.
3.  `seq_ocr_import.puml`: User uploads image $\rightarrow$ System extracts text (mock) $\rightarrow$ User verifies $\rightarrow$ System saves.
4.  `seq_growth_chart.puml`: User requests chart $\rightarrow$ System fetches child data $\rightarrow$ System fetches WHO standards $\rightarrow$ UI renders chart.
5.  `seq_health_alert.puml`: System detects anomaly $\rightarrow$ System generates alert $\rightarrow$ System pushes notification $\rightarrow$ User views alert (with medical disclaimer).

**Validation Checklist per Diagram:**
- [ ] Actors and System boundaries are clearly defined.
- [ ] Happy path is fully mapped.
- [ ] At least one alternative/error flow (e.g., invalid login, OCR failure) is included using `alt/else` blocks.
- [ ] Synchronous and asynchronous messages are used correctly.

---

## 7. Quality Checklist (Phase 1)

- [ ] **UI Consistency:** Colors, fonts, and spacing match the maquettes exactly.
- [ ] **Navigation Completeness:** No dead links; every button either navigates correctly or shows a "Not Implemented" toast.
- [ ] **Mock Data Realism:** Data looks like real medical/child data (realistic weights, heights, dates), not "test1", "test2".
- [ ] **Mobile Responsiveness:** All screens are usable on a 375px width screen (iPhone SE size). Tables scroll horizontally or stack.
- [ ] **Medical Disclaimer:** Clear, visible text stating: *"ChildCare+ is a supportive tracking tool. Always consult a pediatrician for medical advice and diagnosis."* present on Dashboard, Charts, and Alerts.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Scope Creep** (Trying to build real backend/DB too early) | High | Strictly enforce the use of `mockData.js`. Do not install Axios or setup databases until Phase 2. |
| **Design Inconsistency** | Medium | Build and strictly use the `components/` folder. Avoid inline styles; rely entirely on Tailwind utility classes. |
| **Time Pressure on Charts** | High | Use `Recharts` library with simple line/area charts first. Don't overcomplicate the WHO standard curves in the MVP; use static mock arrays for the standard lines. |
| **Missing Assets** | Low | Use free icon libraries (e.g., `lucide-react` or `heroicons`) and placeholder images (Unsplash) to avoid blocking development. |

---

## 9. Final Phase 1 Completion Checklist

- [ ] Maquettes finalized and approved.
- [ ] 5 PlantUML Sequence Diagrams exported to PNG.
- [ ] React project compiles with zero errors or warnings.
- [ ] All 9 core screen groups are built and navigable.
- [ ] `mockData.js` is fully populated and driving the UI.
- [ ] Mobile responsiveness verified via browser dev tools.
- [ ] Medical disclaimers are prominently displayed.
- [ ] Code is committed to Git repository with a clean history.

**$\rightarrow$ Ready to proceed to Phase 2 (Backend & API Integration).**

/* ─── Current User ─── */
export const currentUser = {
  id: 'parent-001',
  firstName: 'Asma',
  lastName: 'Ben Youssef',
  email: 'asma.benyoussef@example.com',
  phone: '+216 98 765 432',
  city: 'Sfax',
  avatar: null,
};

/* ─── Children ─── */
export const children = [
  {
    id: 1,
    name: 'Youssef',
    age: '16 mois',
    birthDate: '2024-10-05',
    sex: 'M',
    bloodType: 'A+',
    allergies: ['Aucune connue'],
    pediatrician: 'Dr. Hichem Trabelsi',
    weight: 10.6,
    height: 80,
    headCircumference: 47.1,
    lastUpdate: 'Il y a 1 jour',
    trend: 'stable',
  },
  {
    id: 2,
    name: 'Meriem',
    age: '3 ans',
    birthDate: '2022-12-14',
    sex: 'F',
    bloodType: 'O+',
    allergies: ['Arachides'],
    pediatrician: 'Dr. Amira Gharbi',
    weight: 14.1,
    height: 96,
    headCircumference: 50.0,
    lastUpdate: 'Il y a 4 jours',
    trend: 'attention',
  },
  {
    id: 3,
    name: 'Aziz',
    age: '5 ans',
    birthDate: '2020-11-22',
    sex: 'M',
    bloodType: 'B+',
    allergies: ['Aucune connue'],
    pediatrician: 'Dr. Hichem Trabelsi',
    weight: 18.7,
    height: 110,
    headCircumference: 52.4,
    lastUpdate: 'Il y a 6 jours',
    trend: 'stable',
  },
];

/* ─── Measurements ─── */
export const measurements = [
  { id: 'm-001', childId: 1, date: '2026-02-25', weight: 10.6, height: 80, headCircumference: 47.1, notes: 'Bilan de routine' },
  { id: 'm-002', childId: 2, date: '2026-02-22', weight: 14.1, height: 96, headCircumference: 50.0, notes: '' },
  { id: 'm-003', childId: 3, date: '2026-02-20', weight: 18.7, height: 110, headCircumference: 52.4, notes: 'Visite annuelle' },
  { id: 'm-004', childId: 1, date: '2026-02-18', weight: 10.4, height: 79.5, headCircumference: 47.0, notes: '' },
  { id: 'm-005', childId: 1, date: '2026-01-20', weight: 10.1, height: 78.5, headCircumference: 46.8, notes: '' },
  { id: 'm-006', childId: 1, date: '2025-12-15', weight: 9.7, height: 77, headCircumference: 46.5, notes: 'Controle pediatrique' },
  { id: 'm-007', childId: 2, date: '2026-01-10', weight: 13.8, height: 95, headCircumference: 49.8, notes: '' },
  { id: 'm-008', childId: 2, date: '2025-11-05', weight: 13.3, height: 93.5, headCircumference: 49.5, notes: '' },
  { id: 'm-009', childId: 3, date: '2026-01-05', weight: 18.2, height: 109, headCircumference: 52.2, notes: '' },
  { id: 'm-010', childId: 3, date: '2025-10-12', weight: 17.5, height: 107, headCircumference: 52.0, notes: '' },
];

/* ─── Growth Chart Data (age in months -> value) ─── */
export const growthData = {
  1: {
    weight: [
      { age: 0, value: 3.4 }, { age: 1, value: 4.2 }, { age: 3, value: 5.8 },
      { age: 6, value: 7.5 }, { age: 9, value: 8.9 }, { age: 12, value: 9.8 },
      { age: 14, value: 10.1 }, { age: 16, value: 10.6 },
    ],
    height: [
      { age: 0, value: 50 }, { age: 1, value: 54 }, { age: 3, value: 60 },
      { age: 6, value: 67 }, { age: 9, value: 72 }, { age: 12, value: 76 },
      { age: 14, value: 78.5 }, { age: 16, value: 80 },
    ],
    head: [
      { age: 0, value: 35 }, { age: 1, value: 37 }, { age: 3, value: 40 },
      { age: 6, value: 43 }, { age: 9, value: 45 }, { age: 12, value: 46 },
      { age: 14, value: 46.8 }, { age: 16, value: 47.1 },
    ],
  },
  2: {
    weight: [
      { age: 0, value: 3.2 }, { age: 3, value: 5.4 }, { age: 6, value: 7.0 },
      { age: 12, value: 9.2 }, { age: 18, value: 10.5 }, { age: 24, value: 12.0 },
      { age: 30, value: 13.3 }, { age: 36, value: 14.1 },
    ],
    height: [
      { age: 0, value: 49 }, { age: 3, value: 59 }, { age: 6, value: 65 },
      { age: 12, value: 74 }, { age: 18, value: 80 }, { age: 24, value: 86 },
      { age: 30, value: 91 }, { age: 36, value: 96 },
    ],
    head: [
      { age: 0, value: 34 }, { age: 3, value: 39 }, { age: 6, value: 42 },
      { age: 12, value: 45 }, { age: 18, value: 47 }, { age: 24, value: 48.5 },
      { age: 30, value: 49.5 }, { age: 36, value: 50 },
    ],
  },
  3: {
    weight: [
      { age: 0, value: 3.5 }, { age: 6, value: 7.8 }, { age: 12, value: 10.2 },
      { age: 24, value: 12.8 }, { age: 36, value: 15.0 }, { age: 48, value: 17.0 },
      { age: 60, value: 18.7 },
    ],
    height: [
      { age: 0, value: 51 }, { age: 6, value: 68 }, { age: 12, value: 77 },
      { age: 24, value: 88 }, { age: 36, value: 97 }, { age: 48, value: 104 },
      { age: 60, value: 110 },
    ],
    head: [
      { age: 0, value: 35.5 }, { age: 6, value: 43.5 }, { age: 12, value: 46.5 },
      { age: 24, value: 49 }, { age: 36, value: 50.5 }, { age: 48, value: 51.5 },
      { age: 60, value: 52.4 },
    ],
  },
};

/* WHO reference percentile bands (simplified, boys 0-60 months) */
export const whoReferenceBoys = {
  weight: [
    { age: 0, p3: 2.5, p50: 3.3, p97: 4.3 },
    { age: 3, p3: 4.7, p50: 6.0, p97: 7.5 },
    { age: 6, p3: 6.2, p50: 7.9, p97: 9.8 },
    { age: 9, p3: 7.2, p50: 9.0, p97: 11.0 },
    { age: 12, p3: 7.8, p50: 9.6, p97: 11.8 },
    { age: 18, p3: 8.8, p50: 10.9, p97: 13.5 },
    { age: 24, p3: 9.7, p50: 12.2, p97: 15.3 },
    { age: 36, p3: 11.3, p50: 14.3, p97: 18.3 },
    { age: 48, p3: 12.7, p50: 16.3, p97: 21.2 },
    { age: 60, p3: 14.1, p50: 18.3, p97: 24.2 },
  ],
  height: [
    { age: 0, p3: 46.3, p50: 49.9, p97: 53.4 },
    { age: 3, p3: 57.6, p50: 61.4, p97: 65.3 },
    { age: 6, p3: 63.6, p50: 67.6, p97: 71.6 },
    { age: 12, p3: 71.0, p50: 75.7, p97: 80.5 },
    { age: 24, p3: 81.0, p50: 87.1, p97: 93.2 },
    { age: 36, p3: 88.7, p50: 96.1, p97: 103.5 },
    { age: 48, p3: 94.9, p50: 103.3, p97: 111.7 },
    { age: 60, p3: 100.7, p50: 110.0, p97: 119.2 },
  ],
};

export const whoReferenceGirls = {
  weight: [
    { age: 0, p3: 2.4, p50: 3.2, p97: 4.2 },
    { age: 3, p3: 4.4, p50: 5.6, p97: 7.0 },
    { age: 6, p3: 5.8, p50: 7.3, p97: 9.0 },
    { age: 9, p3: 6.7, p50: 8.4, p97: 10.4 },
    { age: 12, p3: 7.1, p50: 9.0, p97: 11.2 },
    { age: 18, p3: 8.2, p50: 10.2, p97: 12.8 },
    { age: 24, p3: 9.2, p50: 11.5, p97: 14.6 },
    { age: 36, p3: 10.8, p50: 13.9, p97: 18.0 },
    { age: 48, p3: 12.3, p50: 16.1, p97: 21.5 },
    { age: 60, p3: 13.7, p50: 18.2, p97: 24.9 },
  ],
  height: [
    { age: 0, p3: 45.6, p50: 49.1, p97: 52.7 },
    { age: 3, p3: 56.2, p50: 59.8, p97: 63.5 },
    { age: 6, p3: 61.8, p50: 65.7, p97: 69.8 },
    { age: 12, p3: 69.2, p50: 74.0, p97: 78.9 },
    { age: 24, p3: 80.0, p50: 86.4, p97: 92.9 },
    { age: 36, p3: 87.4, p50: 95.1, p97: 102.7 },
    { age: 48, p3: 94.1, p50: 102.7, p97: 111.3 },
    { age: 60, p3: 99.9, p50: 109.4, p97: 118.9 },
  ],
};

/* ─── Appointments ─── */
export const appointments = [
  { id: 'apt-001', childId: 1, type: 'Pediatre', date: '2026-03-02', dateDisplay: '02 Mars', location: 'Cabinet Dr. Hichem Trabelsi' },
  { id: 'apt-002', childId: 2, type: 'Vaccination', date: '2026-03-11', dateDisplay: '11 Mars', location: 'Centre de sante Sfax Ville' },
  { id: 'apt-003', childId: 3, type: 'Bilan annuel', date: '2026-03-25', dateDisplay: '25 Mars', location: 'Cabinet Dr. Hichem Trabelsi' },
];

/* ─── Alerts ─── */
export const alerts = [
  { id: 1, childId: 1, child: 'Youssef', message: 'Rappel : vaccin ROR prevu le 02 mars.', type: 'info', date: "Aujourd'hui", read: false },
  { id: 2, childId: 2, child: 'Meriem', message: 'Courbe de poids legerement sous le percentile attendu. Controle conseille.', type: 'warning', date: 'Hier', read: false },
  { id: 3, childId: 1, child: 'Youssef', message: 'Prochain bilan de 18 mois a planifier.', type: 'info', date: 'Il y a 2 jours', read: true },
  { id: 4, childId: 3, child: 'Aziz', message: 'Rappel : visite dentaire recommandee a partir de 5 ans.', type: 'info', date: 'Il y a 3 jours', read: true },
  { id: 5, childId: 2, child: 'Meriem', message: 'Allergie aux arachides enregistree — verifiez les aliments donnes en creche.', type: 'warning', date: 'Il y a 5 jours', read: true },
];

/* ─── Pregnancy Tracking ─── */
export const pregnancyData = {
  isActive: true,
  babyNickname: 'Bebe Nour',
  dueDate: '2026-07-15',
  currentWeek: 24,
  trimester: 2,
  entries: [
    { id: 'p-001', week: 12, date: '2026-01-01', weight: 62.5, bloodPressure: '115/75', notes: 'Premiere echographie — tout normal', mood: 'happy' },
    { id: 'p-002', week: 16, date: '2026-01-29', weight: 63.8, bloodPressure: '118/76', notes: 'Mouvements ressentis pour la premiere fois', mood: 'happy' },
    { id: 'p-003', week: 20, date: '2026-02-05', weight: 65.2, bloodPressure: '120/80', notes: 'Echographie morphologique normale', mood: 'neutral' },
    { id: 'p-004', week: 22, date: '2026-02-12', weight: 66.1, bloodPressure: '118/78', notes: 'Prise de fer prescrite', mood: 'neutral' },
    { id: 'p-005', week: 24, date: '2026-02-26', weight: 67.0, bloodPressure: '122/80', notes: 'Test de glucose programme', mood: 'happy' },
  ],
  nextAppointment: { date: '2026-03-12', type: 'Suivi mensuel', location: 'Cabinet Dr. Amira Gharbi' },
  tips: [
    'Pensez a boire au moins 1.5L d\'eau par jour.',
    'Faites une marche legere de 20 minutes quotidiennement.',
    'Le test de glucose (HGPO) est prevu pour la semaine 26.',
    'Commencez a preparer la liste de naissance si ce n\'est pas encore fait.',
  ],
};

/* ─── Vaccinations ─── */
export const vaccinations = [
  { id: 'v-001', childId: 1, name: 'BCG', date: '2024-10-07', status: 'done' },
  { id: 'v-002', childId: 1, name: 'Hepatite B (dose 1)', date: '2024-10-07', status: 'done' },
  { id: 'v-003', childId: 1, name: 'DTP + Polio (dose 1)', date: '2024-12-05', status: 'done' },
  { id: 'v-004', childId: 1, name: 'ROR', date: '2026-03-02', status: 'scheduled' },
  { id: 'v-005', childId: 2, name: 'BCG', date: '2022-12-16', status: 'done' },
  { id: 'v-006', childId: 2, name: 'DTP + Polio (rappel)', date: '2026-03-11', status: 'scheduled' },
];

/* ─── User Settings ─── */
export const userSettings = {
  notifications: true,
  emailAlerts: true,
  smsAlerts: false,
  language: 'fr',
  theme: 'light',
  units: 'metric',
  reminderTime: '09:00',
  autoBackup: true,
};

/* ─── OCR History ─── */
export const ocrHistory = [
  { id: 'ocr-001', fileName: 'carnet_sante_youssef.jpg', date: '2026-02-20', childId: 1, status: 'success', extractedData: { weight: 10.4, height: 79.5, headCircumference: 47.0 } },
  { id: 'ocr-002', fileName: 'ordonnance_meriem.pdf', date: '2026-02-15', childId: 2, status: 'success', extractedData: { weight: 14.0, height: 95.5 } },
];

/* ─── Dashboard Summary ─── */
export const dashboardSummary = {
  recentMeasurementsThisWeek: 4,
  activeAlerts: alerts.filter(a => !a.read).length,
  nextAppointmentLabel: appointments[0].dateDisplay,
  nextAppointmentType: appointments[0].type,
};

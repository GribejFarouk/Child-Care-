/* ─── Current User (Parent) ─── */
export const currentUser = {
  id: 'parent-001',
  firstName: 'Asma',
  lastName: 'Ben Youssef',
  email: 'asma.benyoussef@example.com',
  phone: '+216 98 765 432',
  city: 'Sfax',
  avatar: null,
};

/* ─── Current Doctor (for doctor interface) ─── */
export const currentDoctor = {
  id: 'doc-001',
  firstName: 'Hichem',
  lastName: 'Trabelsi',
  email: 'dr.trabelsi@clinique-sfax.tn',
  phone: '+216 71 234 567',
  specialty: 'Pédiatrie',
  clinic: 'Clinique Les Oliviers, Sfax',
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

/* ─── Measurements (with all supervisor-required fields) ─── */
export const measurements = [
  { id: 'm-001', childId: 1, date: '2026-02-25', weight: 10.6, height: 80, headCircumference: 47.1, footSize: 10.5, earSize: 4.8, neckCircumference: 24.5, wristCircumference: 10.2, bmi: 16.6, source: 'manual', notes: 'Bilan de routine' },
  { id: 'm-002', childId: 2, date: '2026-02-22', weight: 14.1, height: 96, headCircumference: 50.0, footSize: 14.2, earSize: 5.1, neckCircumference: 25.8, wristCircumference: 11.0, bmi: 15.3, source: 'manual', notes: '' },
  { id: 'm-003', childId: 3, date: '2026-02-20', weight: 18.7, height: 110, headCircumference: 52.4, footSize: 17.0, earSize: 5.5, neckCircumference: 27.2, wristCircumference: 12.5, bmi: 15.5, source: 'manual', notes: 'Visite annuelle' },
  { id: 'm-004', childId: 1, date: '2026-02-18', weight: 10.4, height: 79.5, headCircumference: 47.0, footSize: 10.4, earSize: 4.8, neckCircumference: 24.4, wristCircumference: 10.1, bmi: 16.5, source: 'manual', notes: '' },
  { id: 'm-005', childId: 1, date: '2026-01-20', weight: 10.1, height: 78.5, headCircumference: 46.8, footSize: 10.3, earSize: 4.7, neckCircumference: 24.3, wristCircumference: 10.0, bmi: 16.4, source: 'manual', notes: '' },
  { id: 'm-006', childId: 1, date: '2025-12-15', weight: 9.7, height: 77, headCircumference: 46.5, footSize: 10.1, earSize: 4.7, neckCircumference: 24.1, wristCircumference: 9.9, bmi: 16.4, source: 'manual', notes: 'Controle pediatrique' },
  { id: 'm-007', childId: 2, date: '2026-01-10', weight: 13.8, height: 95, headCircumference: 49.8, footSize: 14.0, earSize: 5.0, neckCircumference: 25.6, wristCircumference: 10.9, bmi: 15.3, source: 'ocr', notes: '' },
  { id: 'm-008', childId: 2, date: '2025-11-05', weight: 13.3, height: 93.5, headCircumference: 49.5, footSize: 13.8, earSize: 5.0, neckCircumference: 25.4, wristCircumference: 10.8, bmi: 15.2, source: 'manual', notes: '' },
  { id: 'm-009', childId: 3, date: '2026-01-05', weight: 18.2, height: 109, headCircumference: 52.2, footSize: 16.8, earSize: 5.4, neckCircumference: 27.0, wristCircumference: 12.4, bmi: 15.3, source: 'manual', notes: '' },
  { id: 'm-010', childId: 3, date: '2025-10-12', weight: 17.5, height: 107, headCircumference: 52.0, footSize: 16.5, earSize: 5.4, neckCircumference: 26.8, wristCircumference: 12.2, bmi: 15.3, source: 'manual', notes: '' },
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

/* ─── Appointments (enriched with status, doctor, notes) ─── */
export const appointments = [
  { id: 'apt-001', childId: 1, type: 'Pédiatre', date: '2026-03-02', dateDisplay: '02 Mars', location: 'Cabinet Dr. Hichem Trabelsi', status: 'scheduled', doctor: 'Dr. Hichem Trabelsi', notes: 'Bilan de 18 mois' },
  { id: 'apt-002', childId: 2, type: 'Vaccination', date: '2026-03-11', dateDisplay: '11 Mars', location: 'Centre de santé Sfax Ville', status: 'scheduled', doctor: 'Dr. Amira Gharbi', notes: 'Rappel DTP + Polio' },
  { id: 'apt-003', childId: 3, type: 'Bilan annuel', date: '2026-03-25', dateDisplay: '25 Mars', location: 'Cabinet Dr. Hichem Trabelsi', status: 'scheduled', doctor: 'Dr. Hichem Trabelsi', notes: '' },
  { id: 'apt-004', childId: 1, type: 'Pédiatre', date: '2026-01-15', dateDisplay: '15 Jan', location: 'Cabinet Dr. Hichem Trabelsi', status: 'done', doctor: 'Dr. Hichem Trabelsi', notes: 'Contrôle de routine — RAS' },
  { id: 'apt-005', childId: 2, type: 'Allergologue', date: '2025-12-10', dateDisplay: '10 Déc', location: 'Hôpital Habib Bourguiba', status: 'done', doctor: 'Dr. Karim Souissi', notes: 'Test allergie arachides confirmé' },
  { id: 'apt-006', childId: 3, type: 'Dentiste', date: '2025-11-20', dateDisplay: '20 Nov', location: 'Cabinet dentaire Sfax', status: 'done', doctor: 'Dr. Nadia Mansour', notes: 'Premier contrôle dentaire' },
];

/* ─── Alerts (with title, severity, priority) ─── */
export const alerts = [
  { id: 1, childId: 1, child: 'Youssef', title: 'Rappel vaccination', message: 'Rappel : vaccin ROR prévu le 02 mars.', type: 'info', severity: 'info', priority: 'medium', date: "Aujourd'hui", read: false },
  { id: 2, childId: 2, child: 'Meriem', title: 'Courbe de poids', message: 'Courbe de poids légèrement sous le percentile attendu. Contrôle conseillé.', type: 'warning', severity: 'warning', priority: 'high', date: 'Hier', read: false },
  { id: 3, childId: 1, child: 'Youssef', title: 'Bilan à planifier', message: 'Prochain bilan de 18 mois à planifier.', type: 'info', severity: 'info', priority: 'low', date: 'Il y a 2 jours', read: true },
  { id: 4, childId: 3, child: 'Aziz', title: 'Visite dentaire', message: 'Rappel : visite dentaire recommandée à partir de 5 ans.', type: 'info', severity: 'info', priority: 'low', date: 'Il y a 3 jours', read: true },
  { id: 5, childId: 2, child: 'Meriem', title: 'Allergie enregistrée', message: 'Allergie aux arachides enregistrée — vérifiez les aliments donnés en crèche.', type: 'warning', severity: 'warning', priority: 'medium', date: 'Il y a 5 jours', read: true },
];

/* ─── Vaccinations (enriched) ─── */
export const vaccinations = [
  { id: 'v-001', childId: 1, name: 'BCG', date: '2024-10-07', status: 'done', location: 'Maternité Sfax', doctor: 'Dr. Hichem Trabelsi', notes: '' },
  { id: 'v-002', childId: 1, name: 'Hépatite B (dose 1)', date: '2024-10-07', status: 'done', location: 'Maternité Sfax', doctor: 'Dr. Hichem Trabelsi', notes: '' },
  { id: 'v-003', childId: 1, name: 'DTP + Polio (dose 1)', date: '2024-12-05', status: 'done', location: 'Centre de santé Sfax', doctor: 'Dr. Hichem Trabelsi', notes: '' },
  { id: 'v-004', childId: 1, name: 'ROR', date: '2026-03-02', status: 'scheduled', location: 'Cabinet Dr. Hichem Trabelsi', doctor: 'Dr. Hichem Trabelsi', notes: 'Première dose' },
  { id: 'v-005', childId: 2, name: 'BCG', date: '2022-12-16', status: 'done', location: 'Maternité Sfax', doctor: 'Dr. Amira Gharbi', notes: '' },
  { id: 'v-006', childId: 2, name: 'DTP + Polio (rappel)', date: '2026-03-11', status: 'scheduled', location: 'Centre de santé Sfax Ville', doctor: 'Dr. Amira Gharbi', notes: '' },
  { id: 'v-007', childId: 3, name: 'BCG', date: '2020-11-24', status: 'done', location: 'Maternité Sfax', doctor: 'Dr. Hichem Trabelsi', notes: '' },
  { id: 'v-008', childId: 3, name: 'Hépatite B (3 doses)', date: '2021-05-22', status: 'done', location: 'Centre de santé Sfax', doctor: 'Dr. Hichem Trabelsi', notes: 'Schéma complet' },
];

/* ─── User Settings ─── */
export const userSettings = {
  notifications: true,
  emailAlerts: true,
  smsAlerts: false,
  darkMode: false,
  dataSharing: false,
  language: 'Francais',
  theme: 'Clair',
  units: 'Metrique',
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

/* ─── Doctors (for collaboration) ─── */
export const doctors = [
  { id: 'doc-001', firstName: 'Hichem', lastName: 'Trabelsi', specialty: 'Pédiatrie', phone: '+216 71 234 567', email: 'dr.trabelsi@clinique-sfax.tn', clinic: 'Clinique Les Oliviers, Sfax', status: 'active' },
  { id: 'doc-002', firstName: 'Amira', lastName: 'Gharbi', specialty: 'Pédiatrie', phone: '+216 71 345 678', email: 'dr.gharbi@cabinet-sfax.tn', clinic: 'Cabinet Médical Gharbi, Sfax', status: 'active' },
  { id: 'doc-003', firstName: 'Karim', lastName: 'Souissi', specialty: 'Allergologie pédiatrique', phone: '+216 71 456 789', email: 'dr.souissi@hopital-hb.tn', clinic: 'Hôpital Habib Bourguiba, Sfax', status: 'pending' },
];

/* ─── Sharing Permissions ─── */
export const sharingPermissions = [
  { id: 'sp-001', childId: 1, parentId: 'parent-001', doctorId: 'doc-001', accessCode: 'CCP-YOU-4821', allowedSections: ['growth', 'measurements', 'alerts', 'calendar', 'ocr'], hideDemographics: false, active: true, createdAt: '2026-01-10' },
  { id: 'sp-002', childId: 2, parentId: 'parent-001', doctorId: 'doc-002', accessCode: 'CCP-MER-7293', allowedSections: ['growth', 'measurements', 'alerts'], hideDemographics: false, active: true, createdAt: '2026-01-15' },
  { id: 'sp-003', childId: 2, parentId: 'parent-001', doctorId: 'doc-003', accessCode: 'CCP-MER-1045', allowedSections: ['alerts'], hideDemographics: true, active: true, createdAt: '2026-02-01' },
];

/* ─── Consultation Messages ─── */
export const consultationMessages = [
  { id: 'msg-001', senderId: 'parent-001', senderType: 'parent', receiverId: 'doc-001', childId: 1, content: 'Bonjour Docteur, Youssef a eu un peu de fièvre hier soir. Est-ce normal après le vaccin ?', timestamp: '2026-02-25T09:30:00', read: true },
  { id: 'msg-002', senderId: 'doc-001', senderType: 'doctor', receiverId: 'parent-001', childId: 1, content: 'Bonjour Mme Ben Youssef, une légère fièvre après la vaccination est fréquente et bénigne. Donnez-lui du paracétamol adapté à son poids. Si la fièvre persiste plus de 48h, consultez.', timestamp: '2026-02-25T10:15:00', read: true },
  { id: 'msg-003', senderId: 'parent-001', senderType: 'parent', receiverId: 'doc-001', childId: 1, content: 'Merci Docteur, c\'est rassurant. La fièvre est déjà tombée ce matin.', timestamp: '2026-02-25T14:00:00', read: true },
  { id: 'msg-004', senderId: 'parent-001', senderType: 'parent', receiverId: 'doc-002', childId: 2, content: 'Docteur Gharbi, Meriem a vomi après avoir mangé des biscuits. Faut-il s\'inquiéter pour l\'allergie ?', timestamp: '2026-02-24T16:45:00', read: true },
  { id: 'msg-005', senderId: 'doc-002', senderType: 'doctor', receiverId: 'parent-001', childId: 2, content: 'Vérifiez la composition des biscuits pour traces d\'arachides. Si les symptômes persistent, rendez-vous aux urgences. Sinon, surveillez-la pendant 24h.', timestamp: '2026-02-24T17:20:00', read: false },
];

/* ─── Doctor's Patients View (shared children visible to currentDoctor) ─── */
export const doctorPatients = [
  {
    id: 1, childId: 1, childName: 'Youssef', parentName: 'Asma Ben Youssef',
    age: '16 mois', sex: 'M', lastUpdate: '2026-02-25',
    allowedSections: ['growth', 'measurements', 'alerts', 'calendar', 'ocr'],
    alertStatus: 'none', riskLevel: 'low',
  },
  {
    id: 2, childId: 3, childName: 'Aziz', parentName: 'Asma Ben Youssef',
    age: '5 ans', sex: 'M', lastUpdate: '2026-02-20',
    allowedSections: ['growth', 'measurements', 'alerts'],
    alertStatus: 'info', riskLevel: 'low',
  },
];

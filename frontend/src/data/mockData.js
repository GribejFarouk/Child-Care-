export const currentUser = {
  id: 'parent-001',
  firstName: 'Asma',
  lastName: 'Ben Youssef',
  email: 'asma.benyoussef@example.com',
  city: 'Sfax',
};

export const children = [
  {
    id: 1,
    name: 'Youssef',
    age: '16 mois',
    birthDate: '2024-10-05',
    sex: 'M',
    weight: 10.6,
    height: 80,
    lastUpdate: 'Il y a 1 jour',
    trend: 'stable',
  },
  {
    id: 2,
    name: 'Meriem',
    age: '3 ans',
    birthDate: '2022-12-14',
    sex: 'F',
    weight: 14.1,
    height: 96,
    lastUpdate: 'Il y a 4 jours',
    trend: 'attention',
  },
  {
    id: 3,
    name: 'Aziz',
    age: '5 ans',
    birthDate: '2020-11-22',
    sex: 'M',
    weight: 18.7,
    height: 110,
    lastUpdate: 'Il y a 6 jours',
    trend: 'stable',
  },
];

export const measurements = [
  {
    id: 'm-001',
    childId: 1,
    date: '2026-02-25',
    weight: 10.6,
    height: 80,
    headCircumference: 47.1,
  },
  {
    id: 'm-002',
    childId: 2,
    date: '2026-02-22',
    weight: 14.1,
    height: 96,
    headCircumference: 50.0,
  },
  {
    id: 'm-003',
    childId: 3,
    date: '2026-02-20',
    weight: 18.7,
    height: 110,
    headCircumference: 52.4,
  },
  {
    id: 'm-004',
    childId: 1,
    date: '2026-02-18',
    weight: 10.4,
    height: 79.5,
    headCircumference: 47.0,
  },
];

export const appointments = [
  {
    id: 'apt-001',
    childId: 1,
    type: 'Pédiatre',
    date: '2026-03-02',
    dateDisplay: '02 Mars',
    location: 'Cabinet Dr. Hichem Trabelsi',
  },
  {
    id: 'apt-002',
    childId: 2,
    type: 'Vaccination',
    date: '2026-03-11',
    dateDisplay: '11 Mars',
    location: 'Centre de santé Sfax Ville',
  },
];

export const alerts = [
  {
    id: 1,
    child: 'Youssef',
    message: 'Rappel : vaccin ROR prévu le 02 mars.',
    type: 'info',
    date: 'Aujourd’hui',
  },
  {
    id: 2,
    child: 'Meriem',
    message: 'Courbe de poids légèrement sous le percentile attendu. Contrôle conseillé.',
    type: 'warning',
    date: 'Hier',
  },
];

export const dashboardSummary = {
  recentMeasurementsThisWeek: 4,
  activeAlerts: alerts.length,
  nextAppointmentLabel: appointments[0].dateDisplay,
  nextAppointmentType: appointments[0].type,
};

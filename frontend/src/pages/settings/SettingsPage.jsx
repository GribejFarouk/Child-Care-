import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Bell, LogOut, Camera, CheckCircle2 } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getParentProfile, updateParentProfile, getUserSettings } from '../../api/profiles';
import { updateMe } from '../../api/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [parentProfile, setParentProfile] = useState(null);
  const [profile, setProfile] = useState({ 
    name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.email || ''), 
    email: user?.email || '', 
    phone: user?.phone || '' 
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserSettings().then(data => setSettings(data));

    if (user?.role === 'parent') {
      getParentProfile().then(data => {
        setParentProfile(data);
      }).catch(err => console.error("Error loading profile", err));
    }
  }, [user]);

  // Theme toggling removed for now

  if (!settings) {
    return <div className="text-center py-10 text-gray-500">Chargement...</div>;
  }

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    const [firstName, ...rest] = profile.name.trim().split(/\s+/);

    try {
      await updateMe({
        first_name: firstName || '',
        last_name: rest.join(' '),
        phone: profile.phone,
      });

      if (user?.role === 'parent') {
        await updateParentProfile({
          city: parentProfile?.city || '',
          notification_preferences: {
            notifications: settings.notifications,
            emailAlerts: settings.emailAlerts,
          },
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Settings save error', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleItems = [
    { key: 'notifications', label: 'Notifications push', description: 'Recevoir les rappels de vaccins et rendez-vous', icon: Bell },
    { key: 'emailAlerts', label: 'Alertes email', description: 'Recevoir un email pour les alertes importantes', icon: Bell },
  ];

  return (
    <motion.div className="max-w-3xl mx-auto pb-10" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">Paramètres</p>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Réglages</h1>
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-success-50 border border-success-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-500" />
          <p className="text-sm font-medium text-success-700">Modifications enregistrées !</p>
        </motion.div>
      )}

      {/* Profile Section */}
      <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-5 flex items-center gap-2">
          <User size={14} /> Profil utilisateur
        </h3>
        <div className="flex items-start gap-5 mb-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gray-900 flex items-center justify-center text-white shadow-sm hover:bg-gray-700 transition-colors">
              <Camera size={10} />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">{profile.name}</p>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'name', label: 'Nom complet', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Téléphone', type: 'tel' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</label>
              <input
                type={field.type}
                value={profile[field.key]}
                onChange={(e) => setProfile((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Toggles */}
      <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-5">Préférences</h3>
        <div className="divide-y divide-gray-100">
          {toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                  <item.icon size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-primary-500' : 'bg-gray-200'}`}
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings[item.key] ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeUp} className="space-y-3 mb-8">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <CheckCircle2 size={16} />
          Enregistrer les modifications
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-danger-500 bg-danger-50 hover:bg-danger-100 transition-all"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </motion.div>
    </motion.div>
  );
}

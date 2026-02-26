import { Link } from 'react-router-dom';
import { Heart, Shield, Activity, ChevronRight, Smartphone, Bell, LineChart, ArrowRight, Star, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';

/* ── Floating Orb Component (decorative) ── */
function FloatingOrb({ size, color, top, left, delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      {/* Floating Orbs */}
      <FloatingOrb size="320px" color="rgba(0,122,255,0.08)" top="-5%" left="60%" delay={0} />
      <FloatingOrb size="240px" color="rgba(0,122,255,0.06)" top="30%" left="-5%" delay={2} />
      <FloatingOrb size="200px" color="rgba(99,180,255,0.07)" top="60%" left="70%" delay={4} />

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200/50 bg-white/70 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm">
              <Heart className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <span className="ml-2.5 text-xl font-bold text-gray-900 tracking-tight">ChildCare+</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Se connecter
            </Link>
            <Link to="/signup" className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ── Hero Section ── */}
        <motion.div
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24 text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-600 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary-500 mr-2 animate-pulse"></span>
            Nouveau : Suivi OMS intégré
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.08]">
            La santé de votre enfant,<br />
            <span className="text-gradient">
              au bout des doigts.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 leading-relaxed">
            Un outil d'assistance conçu pour les parents. Suivez la croissance, gérez les rendez-vous et recevez des alertes intelligentes en toute simplicité.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group">
              Créer un compte gratuit
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#features" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
              Découvrir les fonctionnalités
            </a>
          </motion.div>
        </motion.div>

        {/* ── Social Proof ── */}
        <motion.div
          className="max-w-3xl mx-auto px-4 pb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span><strong className="text-gray-600">1 200+</strong> parents inscrits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
              <span><strong className="text-gray-600">4.9/5</strong> satisfaction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              <span>Données <strong className="text-gray-600">100% sécurisées</strong></span>
            </div>
          </div>
        </motion.div>

        {/* ── Bento Grid Features ── */}
        <div id="features" className="py-16 md:py-24 bg-white relative">
          <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Tout ce dont vous avez besoin.</h2>
              <p className="mt-4 text-lg text-gray-500">Une interface claire, des données précises, une tranquillité d'esprit.</p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Large Feature Card — WHO Curves */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="md:col-span-2 bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 md:p-12 border border-gray-100 overflow-hidden relative group cursor-default shimmer-hover"
              >
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-card border border-gray-100">
                    <LineChart className="h-6 w-6 text-primary-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Courbes de croissance OMS</h3>
                  <p className="text-gray-500 text-lg leading-relaxed">
                    Visualisez instantanément l'évolution de votre enfant par rapport aux standards mondiaux. Poids, taille et périmètre crânien sur des graphiques interactifs.
                  </p>
                  <div className="mt-6 flex items-center text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    En savoir plus <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 w-72 h-72 bg-gradient-to-br from-primary-50 to-blue-50/50 rounded-tl-[80px] opacity-40 group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* Small Feature Card — Smart Alerts */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 cursor-default group shimmer-hover"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-card border border-gray-100">
                  <Bell className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Alertes Intelligentes</h3>
                <p className="text-gray-500 leading-relaxed">
                  Recevez des notifications pour les vaccins, les rendez-vous et les anomalies de croissance.
                </p>
              </motion.div>

              {/* Small Feature Card — Privacy */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 cursor-default group shimmer-hover"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-card border border-gray-100">
                  <Shield className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Données Privées</h3>
                <p className="text-gray-500 leading-relaxed">
                  Vos informations médicales sont chiffrées et stockées en toute sécurité. Vous seul y avez accès.
                </p>
              </motion.div>

              {/* Large Feature Card — Mobile First */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="md:col-span-2 bg-gray-900 rounded-3xl p-8 md:p-12 overflow-hidden relative group cursor-default"
              >
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Conçu pour le mobile</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Ajoutez des mesures d'une seule main pendant que vous tenez votre bébé. L'interface s'adapte parfaitement à tous vos écrans.
                  </p>
                  <div className="mt-6 flex items-center text-gray-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Découvrir l'application <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
                <div className="absolute right-0 top-0 w-72 h-72 bg-gradient-to-bl from-primary-500/20 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform duration-700" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ── How it Works ── */}
        <div className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Comment ça marche ?</h2>
              <p className="mt-4 text-lg text-gray-500">Trois étapes simples pour un suivi complet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {[
                { step: '01', title: 'Créez un profil', desc: 'Ajoutez les informations de base de votre enfant en quelques secondes.' },
                { step: '02', title: 'Saisissez les mesures', desc: 'Entrez le poids et la taille après chaque visite chez le pédiatre.' },
                { step: '03', title: 'Suivez l\'évolution', desc: 'Visualisez instantanément la courbe de croissance et recevez des conseils.' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="relative text-center"
                >
                  <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center shadow-card border border-gray-100 mb-6 relative z-10 group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                    <span className="text-2xl font-bold text-gradient">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh-gradient opacity-30 pointer-events-none" />
          <FloatingOrb size="260px" color="rgba(0,122,255,0.06)" top="20%" left="10%" delay={1} />
          <FloatingOrb size="180px" color="rgba(0,122,255,0.05)" top="50%" left="80%" delay={3} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">
              Prêt à simplifier le suivi<br className="hidden sm:block" /> de votre enfant ?
            </h2>
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 group">
              Commencer maintenant <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <p className="mt-6 text-sm text-gray-400">
              Gratuit. Sécurisé. Conçu avec amour pour les parents.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="bg-gray-900 text-gray-400 py-12 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" fill="currentColor" />
                </div>
                <span className="ml-2 text-sm font-semibold text-white">ChildCare+</span>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
                <Link to="/login" className="hover:text-white transition-colors">Connexion</Link>
                <Link to="/signup" className="hover:text-white transition-colors">Inscription</Link>
              </div>
              <p className="text-xs text-gray-500">
                © 2026 ChildCare+. Projet PFE.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

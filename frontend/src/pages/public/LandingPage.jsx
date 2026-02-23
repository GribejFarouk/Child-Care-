import { Link } from 'react-router-dom';
import { Heart, Shield, Activity, ChevronRight, Smartphone, Bell, LineChart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden font-sans">
      {/* Apple-like Mesh Gradient Background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200/50 bg-white/70 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Heart className="h-6 w-6 text-primary-500" fill="currentColor" />
            <span className="ml-2 text-xl font-semibold text-primary-900 tracking-tight">ChildCare+</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="text-sm text-gray-600 hover:text-primary-900 font-medium transition-colors">
              Se connecter
            </Link>
            <Link to="/login" className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-600 transition-all shadow-sm hover:shadow-md">
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <motion.div 
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24 text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-600 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary-500 mr-2 animate-pulse"></span>
            Nouveau : Suivi OMS intégré
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold text-primary-900 tracking-tight leading-[1.1]">
            La santé de votre enfant,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-400">
              au bout des doigts.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 leading-relaxed">
            Un outil d'assistance conçu pour les parents. Suivez la croissance, gérez les rendez-vous et recevez des alertes intelligentes en toute simplicité.
          </motion.p>
          
          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-white bg-primary-900 hover:bg-primary-800 transition-all shadow-apple hover:shadow-apple-hover hover:-translate-y-0.5">
              Créer un compte gratuit
            </Link>
            <a href="#features" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-primary-900 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
              Découvrir les fonctionnalités
            </a>
          </motion.div>
        </motion.div>

        {/* Bento Grid Features Section */}
        <div id="features" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Tout ce dont vous avez besoin.</h2>
              <p className="mt-4 text-lg text-gray-500">Une interface claire, des données précises, une tranquillité d'esprit.</p>
            </div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Large Feature Card */}
              <motion.div 
                variants={fadeUp} 
                whileHover={{ y: -5, scale: 1.01 }}
                className="md:col-span-2 bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-100 overflow-hidden relative group cursor-default"
              >
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <LineChart className="h-6 w-6 text-primary-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary-900 mb-4">Courbes de croissance OMS</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Visualisez instantanément l'évolution de votre enfant par rapport aux standards mondiaux. Poids, taille et périmètre crânien sur des graphiques interactifs.
                  </p>
                  <div className="mt-6 flex items-center text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    En savoir plus <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
                {/* Decorative abstract element */}
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-br from-primary-100 to-blue-50 rounded-tl-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* Small Feature Card 1 */}
              <motion.div 
                variants={fadeUp} 
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 cursor-default group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Bell className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-primary-900 mb-3">Alertes Intelligentes</h3>
                <p className="text-gray-600 leading-relaxed">
                  Recevez des notifications pour les vaccins, les rendez-vous et les anomalies de croissance.
                </p>
              </motion.div>

              {/* Small Feature Card 2 */}
              <motion.div 
                variants={fadeUp} 
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 cursor-default group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Shield className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-primary-900 mb-3">Données Privées</h3>
                <p className="text-gray-600 leading-relaxed">
                  Vos informations médicales sont chiffrées et stockées en toute sécurité. Vous seul y avez accès.
                </p>
              </motion.div>

              {/* Large Feature Card 2 */}
              <motion.div 
                variants={fadeUp} 
                whileHover={{ y: -5, scale: 1.01 }}
                className="md:col-span-2 bg-primary-900 rounded-3xl p-8 md:p-12 overflow-hidden relative group cursor-default"
              >
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-primary-800 rounded-2xl flex items-center justify-center mb-6">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Conçu pour le mobile</h3>
                  <p className="text-primary-100 text-lg leading-relaxed">
                    Ajoutez des mesures d'une seule main pendant que vous tenez votre bébé. L'interface s'adapte parfaitement à tous vos écrans.
                  </p>
                  <div className="mt-6 flex items-center text-primary-200 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Découvrir l'application <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-primary-800 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* How it works section */}
        <div className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Comment ça marche ?</h2>
              <p className="mt-4 text-lg text-gray-500">Trois étapes simples pour un suivi complet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {[
                { step: '01', title: 'Créez un profil', desc: 'Ajoutez les informations de base de votre enfant en quelques secondes.' },
                { step: '02', title: 'Saisissez les mesures', desc: 'Entrez le poids et la taille après chaque visite chez le pédiatre.' },
                { step: '03', title: 'Suivez l\'évolution', desc: 'Visualisez instantanément la courbe de croissance et recevez des conseils.' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative text-center"
                >
                  <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-6 relative z-10">
                    <span className="text-2xl font-bold text-primary-500">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-primary-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh-gradient opacity-30 pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-primary-900 tracking-tight mb-8">
              Prêt à simplifier le suivi de votre enfant ?
            </h2>
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-full text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-apple hover:shadow-apple-hover hover:-translate-y-1">
              Commencer maintenant <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-6 text-sm text-gray-500">
              Gratuit. Sécurisé. Conçu avec amour pour les parents.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

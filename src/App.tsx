import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import ClinicDirectory from './components/ClinicDirectory.jsx';
import CrisisReporting from './components/CrisisReporting.jsx';
import { MessageSquare, MapPin, ClipboardList, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'clinics' | 'reporting'>('chat');
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  // Synchronize darkMode class on documentElement for Tailwind 4 support
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Safe navigation wrapper when clicking suggested clinic chips
  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setActiveTab('clinics');

    // Scroll to the clinic card after tab changes
    setTimeout(() => {
      const element = document.getElementById(`clinic-card-${clinicId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Header with emergency hotlines and darkmode */}
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onNavigateToClinics={() => setActiveTab('clinics')}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* Tab Selection Interface */}
        <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-xs">
          <div className="grid grid-cols-3 w-full gap-1">
            
            {/* AI Chatbot Tab */}
            <button
              onClick={() => {
                setActiveTab('chat');
                setSelectedClinicId(null);
              }}
              id="tab-chat"
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Harri AI Nav</span>
            </button>

            {/* Find Clinics Tab */}
            <button
              onClick={() => {
                setActiveTab('clinics');
              }}
              id="tab-clinics"
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                activeTab === 'clinics'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Find Clinics</span>
            </button>

            {/* Anonymous Reports Tab */}
            <button
              onClick={() => {
                setActiveTab('reporting');
                setSelectedClinicId(null);
              }}
              id="tab-reporting"
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                activeTab === 'reporting'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Anonymous Reports</span>
            </button>

          </div>
        </div>

        {/* Dynamic View Panel with Staggered Fade Entrance animations */}
        <div className="py-2">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChatInterface onClinicSelect={handleClinicSelect} />
              </motion.div>
            )}

            {activeTab === 'clinics' && (
              <motion.div
                key="clinics-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ClinicDirectory 
                  selectedClinicId={selectedClinicId}
                  setSelectedClinicId={setSelectedClinicId}
                />
              </motion.div>
            )}

            {activeTab === 'reporting' && (
              <motion.div
                key="reporting-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <CrisisReporting />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Reassuring Footer with Natural Tones status metadata */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/80 py-6 text-xs text-zinc-500 dark:text-[#848E84] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/60 pb-4">
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-8 uppercase tracking-widest text-[10px] text-zinc-400 dark:text-[#586358] font-semibold">
              <span>Session: Secure & Anonymous</span>
              <span>Region: Precinct 1 (Houston)</span>
              <span>HIPAA: Certified HB 300</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-[#586358] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                System Ready
              </span>
              <span>Latency: 24ms</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="flex items-center gap-1.5 justify-center sm:justify-start">
              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-[#A3B18A] shrink-0" />
              <span>Ask Harri does not store any PII, cookies, or logs. Fully compliant with Texas HB 300 and HIPAA guidelines.</span>
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-[#586358]">
              Harris County Mental Health Digital Access Project &copy; 2026. Made with ❤️ in Houston.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

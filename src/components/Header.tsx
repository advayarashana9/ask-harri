import { Phone, HeartHandshake, Shield, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onNavigateToClinics: () => void;
}

export default function Header({ darkMode, toggleDarkMode, onNavigateToClinics }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-600 rounded-full text-emerald-600 dark:text-white">
              <HeartHandshake className="w-7 h-7" id="header-logo-icon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-emerald-500 flex items-center gap-2">
                Ask Harri
                <span className="text-[10px] bg-emerald-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Precinct 1 • Harris Co.
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                Stigma-Free Multilingual Mental Health & Resource Companion
              </p>
            </div>
          </div>

          {/* Quick-Action Crisis Hotlines */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* 988 Lifeline */}
            <a
              href="tel:988"
              id="btn-call-988"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-600 dark:hover:bg-rose-700 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-white text-xs font-bold shadow-md transition-all duration-150 min-h-[44px] sm:min-h-[auto]"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Emergency Help: 988</span>
            </a>

            {/* The Harris Center helpline */}
            <a
              href="tel:7139707000"
              id="btn-call-harris-center"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-amber-200 dark:border-zinc-700 text-amber-700 dark:text-emerald-400 text-xs font-bold shadow-sm transition-all duration-150 min-h-[44px] sm:min-h-[auto]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Harris Crisis: 713-970-7000</span>
            </a>

            {/* HIPAA Safeguard Shield Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs border border-zinc-200 dark:border-zinc-800">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Fully Anonymous & Compliant</span>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              id="btn-toggle-darkmode"
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Toggle visual theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

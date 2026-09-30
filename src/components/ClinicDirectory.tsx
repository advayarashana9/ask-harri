import { useState } from 'react';
import { CLINICS } from '../data/clinics.js';
import { Clinic } from '../types.js';
import { Search, MapPin, Phone, Globe, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ZIP_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Medical Center / South
  '77030': { lat: 29.702, lng: -95.402 },
  '77004': { lat: 29.723, lng: -95.367 },
  '77021': { lat: 29.689, lng: -95.363 },
  '77025': { lat: 29.682, lng: -95.429 },
  '77054': { lat: 29.679, lng: -95.405 },
  // Southwest / Alief / Sharpstown
  '77036': { lat: 29.715, lng: -95.530 },
  '77072': { lat: 29.704, lng: -95.584 },
  '77099': { lat: 29.658, lng: -95.562 },
  '77083': { lat: 29.701, lng: -95.642 },
  '77074': { lat: 29.691, lng: -95.513 },
  '77082': { lat: 29.734, lng: -95.603 },
  // East End
  '77011': { lat: 29.748, lng: -95.311 },
  '77012': { lat: 29.718, lng: -95.279 },
  '77003': { lat: 29.749, lng: -95.345 },
  '77023': { lat: 29.723, lng: -95.321 },
  '77087': { lat: 29.689, lng: -95.298 },
  // Central / Heights / West U / Montrose / Galleria / Uptown / Bellaire
  '77002': { lat: 29.757, lng: -95.365 },
  '77005': { lat: 29.718, lng: -95.433 },
  '77006': { lat: 29.740, lng: -95.393 },
  '77007': { lat: 29.774, lng: -95.412 },
  '77008': { lat: 29.801, lng: -95.418 },
  '77009': { lat: 29.795, lng: -95.375 },
  '77019': { lat: 29.754, lng: -95.405 },
  '77024': { lat: 29.761, lng: -95.526 },
  '77027': { lat: 29.735, lng: -95.445 },
  '77042': { lat: 29.736, lng: -95.553 },
  '77056': { lat: 29.743, lng: -95.471 },
  '77057': { lat: 29.744, lng: -95.495 },
  '77098': { lat: 29.733, lng: -95.416 },
  '77401': { lat: 29.704, lng: -95.461 },
  // North / Northwest
  '77018': { lat: 29.831, lng: -95.428 },
  '77022': { lat: 29.832, lng: -95.385 },
  '77040': { lat: 29.873, lng: -95.542 },
  '77041': { lat: 29.851, lng: -95.589 },
  '77043': { lat: 29.799, lng: -95.578 },
  '77055': { lat: 29.794, lng: -95.495 },
  '77064': { lat: 29.913, lng: -95.568 },
  '77065': { lat: 29.912, lng: -95.617 },
  '77066': { lat: 29.981, lng: -95.498 },
  '77067': { lat: 29.967, lng: -95.445 },
  '77068': { lat: 30.012, lng: -95.492 },
  '77069': { lat: 29.998, lng: -95.534 },
  '77080': { lat: 29.814, lng: -95.518 },
  '77090': { lat: 30.015, lng: -95.435 },
  '77081': { lat: 29.715, lng: -95.478 },
  '77084': { lat: 29.845, lng: -95.698 },
  '77088': { lat: 29.874, lng: -95.443 },
  '77091': { lat: 29.866, lng: -95.425 },
  '77092': { lat: 29.834, lng: -95.467 },
  '77095': { lat: 29.914, lng: -95.679 },
  // Northeast / East
  '77013': { lat: 29.795, lng: -95.234 },
  '77015': { lat: 29.775, lng: -95.178 },
  '77016': { lat: 29.843, lng: -95.295 },
  '77020': { lat: 29.778, lng: -95.312 },
  '77026': { lat: 29.805, lng: -95.334 },
  '77028': { lat: 29.828, lng: -95.278 },
  '77029': { lat: 29.768, lng: -95.232 },
  '77044': { lat: 29.905, lng: -95.174 },
  '77049': { lat: 29.841, lng: -95.161 },
  '77078': { lat: 29.848, lng: -95.232 },
  '77093': { lat: 29.854, lng: -95.342 },
  // Southeast / Pasadena / South
  '77017': { lat: 29.688, lng: -95.249 },
  '77033': { lat: 29.673, lng: -95.334 },
  '77034': { lat: 29.641, lng: -95.228 },
  '77047': { lat: 29.625, lng: -95.352 },
  '77048': { lat: 29.619, lng: -95.318 },
  '77051': { lat: 29.664, lng: -95.378 },
  '77058': { lat: 29.563, lng: -95.097 },
  '77059': { lat: 29.589, lng: -95.138 },
  '77061': { lat: 29.658, lng: -95.272 },
  '77062': { lat: 29.565, lng: -95.127 },
  '77075': { lat: 29.628, lng: -95.258 },
  '77089': { lat: 29.584, lng: -95.215 },
  // Southwest / Missouri City / Stafford / Fort Bend adjacent
  '77031': { lat: 29.654, lng: -95.534 },
  '77035': { lat: 29.658, lng: -95.485 },
  '77045': { lat: 29.641, lng: -95.441 },
  '77053': { lat: 29.608, lng: -95.485 },
  '77071': { lat: 29.653, lng: -95.508 },
  '77085': { lat: 29.632, lng: -95.468 },
  '77096': { lat: 29.674, lng: -95.483 },
  '77477': { lat: 29.618, lng: -95.561 },
  '77489': { lat: 29.598, lng: -95.508 },
  '77459': { lat: 29.565, lng: -95.562 },
  // Raleigh / North Carolina adjacent demo ZIPs
  '27604': { lat: 35.795, lng: -78.625 },
};

function getZipCoordinates(zip: string): { lat: number; lng: number } {
  const cleanZip = zip.trim();
  if (ZIP_COORDINATES[cleanZip]) {
    return ZIP_COORDINATES[cleanZip];
  }
  
  // Fallback: find numerically closest ZIP code in our dataset
  const numZip = parseInt(cleanZip, 10);
  if (isNaN(numZip)) {
    return { lat: 29.75, lng: -95.4 }; // Center of Houston
  }
  
  let closestZip = '77030';
  let minDiff = Infinity;
  for (const z of Object.keys(ZIP_COORDINATES)) {
    const nz = parseInt(z, 10);
    const diff = Math.abs(nz - numZip);
    if (diff < minDiff) {
      minDiff = diff;
      closestZip = z;
    }
  }
  return ZIP_COORDINATES[closestZip];
}

function getClinicZip(clinic: Clinic): string {
  const match = clinic.address.match(/\b\d{5}\b/);
  if (match) return match[0];
  const firstNumeric = clinic.zipCodes.find(z => /^\d{5}$/.test(z));
  return firstNumeric || '77030';
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

interface ClinicDirectoryProps {
  onSuggestSelect?: string;
  selectedClinicId?: string | null;
  setSelectedClinicId?: (id: string | null) => void;
}

interface ClinicWithDistance extends Clinic {
  distance?: number;
  isMobileService?: boolean;
  isPhoneService?: boolean;
}

export default function ClinicDirectory({ selectedClinicId, setSelectedClinicId }: ClinicDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [zipCodeQuery, setZipCodeQuery] = useState('');
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);

  // Filter and sort clinical data based on user constraints (Zip code matching is prioritized)
  const filteredClinics: ClinicWithDistance[] = CLINICS.filter(clinic => {
    // Search query match (name, description, address, services)
    const matchesQuery = 
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    // Language match
    const matchesLanguage = 
      selectedLanguage === 'All' || 
      clinic.languages.some(l => l.toLowerCase() === selectedLanguage.toLowerCase() || clinic.languages.join(' ').toLowerCase().includes(selectedLanguage.toLowerCase()));

    // Service match
    const matchesService = 
      selectedService === 'All' || 
      clinic.services.some(s => s.toLowerCase() === selectedService.toLowerCase() || clinic.services.join(' ').toLowerCase().includes(selectedService.toLowerCase()));

    // ZIP code match
    const isFiveDigitZip = /^\d{5}$/.test(zipCodeQuery.trim());
    const matchesZip = 
      !zipCodeQuery.trim() || 
      isFiveDigitZip || // Any 5-digit ZIP query works and sorts rather than strictly filtering out other clinics
      clinic.zipCodes.some(z => z.toLowerCase().includes(zipCodeQuery.trim()) || z === 'All Harris County ZIP codes');

    // Emergency filter
    const matchesEmergency = !showEmergencyOnly || clinic.isEmergency;

    return matchesQuery && matchesLanguage && matchesService && matchesZip && matchesEmergency;
  }).map((clinic): ClinicWithDistance => {
    const q = zipCodeQuery.trim();
    if (/^\d{5}$/.test(q)) {
      const userCoords = getZipCoordinates(q);
      
      // Dispatch or helpline services
      if (clinic.id === 'harris-center-helpline' || clinic.id === 'texas-211-harris') {
        return { ...clinic, isPhoneService: true };
      }
      if (clinic.id === 'harris-center-mcot') {
        return { ...clinic, isMobileService: true };
      }

      const clinicZip = getClinicZip(clinic);
      const clinicCoords = getZipCoordinates(clinicZip);
      const distance = getDistance(userCoords.lat, userCoords.lng, clinicCoords.lat, clinicCoords.lng);
      return { ...clinic, distance };
    }
    return clinic;
  }).sort((a: ClinicWithDistance, b: ClinicWithDistance) => {
    const q = zipCodeQuery.trim();
    if (/^\d{5}$/.test(q)) {
      // Prioritize physical clinics with direct distances
      if (a.distance !== undefined && b.distance === undefined) return -1;
      if (a.distance === undefined && b.distance !== undefined) return 1;
      
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      if (a.isMobileService && !b.isMobileService) return -1;
      if (!a.isMobileService && b.isMobileService) return 1;
    } else if (q) {
      // Prioritize exact matching ZIP codes
      const aHasExact = a.zipCodes.some(z => z === q);
      const bHasExact = b.zipCodes.some(z => z === q);
      if (aHasExact && !bHasExact) return -1;
      if (!aHasExact && bHasExact) return 1;

      // Prioritize partial ZIP match over county-wide
      const aHasPartial = a.zipCodes.some(z => z.startsWith(q));
      const bHasPartial = b.zipCodes.some(z => z.startsWith(q));
      if (aHasPartial && !bHasPartial) return -1;
      if (!aHasPartial && bHasPartial) return 1;

      // Specific ZIP matches come before general county-wide ones
      const aIsCountyWide = a.zipCodes.includes('All Harris County ZIP codes') && a.zipCodes.length === 1;
      const bIsCountyWide = b.zipCodes.includes('All Harris County ZIP codes') && b.zipCodes.length === 1;
      if (!aIsCountyWide && bIsCountyWide) return -1;
      if (aIsCountyWide && !bIsCountyWide) return 1;
    }
    return 0;
  });

  const languagesAvailable = ['All', 'Spanish', 'Vietnamese', 'Chinese', 'Arabic', 'English'];
  const servicesAvailable = [
    'All', 
    'Mental Health Counseling', 
    'Crisis Stabilization', 
    'Sliding Scale Fees', 
    'Primary Family Medicine'
  ];

  // Quick areas shortcuts
  const applyPresetFilter = (type: 'alief' | 'east-end' | 'crisis' | 'all') => {
    if (type === 'alief') {
      setZipCodeQuery('77072');
      setSelectedLanguage('All');
      setSelectedService('All');
      setShowEmergencyOnly(false);
    } else if (type === 'east-end') {
      setZipCodeQuery('77011');
      setSelectedLanguage('All');
      setSelectedService('All');
      setShowEmergencyOnly(false);
    } else if (type === 'crisis') {
      setShowEmergencyOnly(true);
      setZipCodeQuery('');
      setSelectedLanguage('All');
      setSelectedService('All');
    } else {
      setSearchQuery('');
      setZipCodeQuery('');
      setSelectedLanguage('All');
      setSelectedService('All');
      setShowEmergencyOnly(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Harris County Community Clinic Locator
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl">
          We maintain a verified, hyper-local directory of sliding-scale clinics, NGO advocacy support teams, and state-designated psychiatric authorities. Search below to find care close to you that speaks your language.
        </p>
      </div>

      {/* Preset shortcut chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Quick Searches:</span>
        <button
          onClick={() => applyPresetFilter('all')}
          className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          All Clinics
        </button>
        <button
          onClick={() => applyPresetFilter('crisis')}
          className="px-3 py-1 text-xs font-medium rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
        >
          🚨 Crisis Stabilization & Emergency Care
        </button>
        <button
          onClick={() => applyPresetFilter('alief')}
          className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          📍 Alief Area Clinics (ZIP 77072)
        </button>
        <button
          onClick={() => applyPresetFilter('east-end')}
          className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          📍 East End Spanish Hub (ZIP 77011)
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Keyword Search */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Search Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Clinic name, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
              />
            </div>
          </div>

          {/* ZIP Code Lookup */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ZIP Code Lookup</label>
            <input
              type="text"
              maxLength={5}
              placeholder="e.g. 77036"
              value={zipCodeQuery}
              onChange={(e) => setZipCodeQuery(e.target.value.replace(/\D/g, ''))}
              className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
            />
          </div>

          {/* Languages Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Languages Spoken</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
            >
              {languagesAvailable.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Services Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Services Offered</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
            >
              {servicesAvailable.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Emergency toggle */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
          <input
            type="checkbox"
            id="checkbox-emergency"
            checked={showEmergencyOnly}
            onChange={(e) => setShowEmergencyOnly(e.target.checked)}
            className="w-4.5 h-4.5 text-emerald-600 border-zinc-300 rounded focus:ring-emerald-500 focus:ring-2 dark:bg-zinc-900 dark:border-zinc-800"
          />
          <label htmlFor="checkbox-emergency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            Show only 24/7 psychiatric emergency crisis response teams (NPC, MCOT, Helpline)
          </label>
        </div>
      </div>

      {/* Directory Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Showing {filteredClinics.length} clinical resources matching filters
          </p>
        </div>

        {filteredClinics.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No clinics matched your specific filters.</p>
            <button
              onClick={() => applyPresetFilter('all')}
              className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold underline mt-1"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredClinics.map((clinic) => {
              const isSelected = selectedClinicId === clinic.id;
              return (
                <div
                  key={clinic.id}
                  id={`clinic-card-${clinic.id}`}
                  className={`border rounded-2xl p-5 bg-white dark:bg-zinc-950 flex flex-col justify-between transition-all duration-300 ${
                    isSelected 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                      : clinic.isEmergency 
                        ? 'border-rose-100 dark:border-rose-950/30 hover:border-rose-300' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header tags */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          clinic.isEmergency
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}>
                          {clinic.type}
                        </span>
                        {zipCodeQuery.trim() && clinic.zipCodes.includes(zipCodeQuery.trim()) && (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 animate-pulse">
                            Serving ZIP {zipCodeQuery.trim()}
                          </span>
                        )}
                        {clinic.distance !== undefined && (
                          <span className="bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-900/40">
                            📍 {clinic.distance.toFixed(1)} miles away
                          </span>
                        )}
                        {clinic.isMobileService && zipCodeQuery.trim() && (
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                            🚗 Mobile Dispatch
                          </span>
                        )}
                        {clinic.isPhoneService && zipCodeQuery.trim() && (
                          <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900/40">
                            📞 Phone Helpline
                          </span>
                        )}
                      </div>

                      {clinic.isEmergency && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase animate-pulse">
                          ● Open 24/7 / Emergency
                        </span>
                      )}
                    </div>

                    {/* Clinic Name */}
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {clinic.name}
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        {clinic.description}
                      </p>
                    </div>

                    {/* Languages tag cloud */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Languages:</span>
                      {clinic.languages.map(lang => (
                        <span
                          key={lang}
                          className="text-[10px] font-medium bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800 px-2 py-0.5 rounded-md"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>

                    {/* Cost structure & services */}
                    <div className="text-xs bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900/60 rounded-xl p-3 space-y-1 text-zinc-600 dark:text-zinc-400">
                      <p className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">Cost:</span> {clinic.costInfo}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">Hours:</span> {clinic.hours}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-900/60 mt-4">
                    {/* Call Clinic */}
                    <a
                      href={`tel:${clinic.phone.replace(/-/g, '')}`}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all min-h-[44px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{clinic.phone}</span>
                    </a>

                    {/* Directions */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + ' ' + clinic.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all min-h-[44px]"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>Map/Directions</span>
                    </a>

                    {/* Website */}
                    <a
                      href={clinic.website}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/30 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Visit Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

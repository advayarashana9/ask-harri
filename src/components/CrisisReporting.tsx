import { useState, useEffect, FormEvent } from 'react';
import { AnonymousReport } from '../types.js';
import { FileText, Search, ClipboardList, Shield, Info, PlusCircle, Clock, Loader2, ArrowRight } from 'lucide-react';

export default function CrisisReporting() {
  const [reports, setReports] = useState<AnonymousReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState('Anxiety / Panic Attack');
  const [formDescription, setFormDescription] = useState('');
  const [formZipCode, setFormZipCode] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<AnonymousReport | null>(null);

  // Tracker states
  const [trackIdQuery, setTrackIdQuery] = useState('');
  const [trackedReport, setTrackedReport] = useState<AnonymousReport | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleCreateReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setError('Please describe your concern.');
      return;
    }
    if (formZipCode.length < 5) {
      setError('Please provide a valid 5-digit Harris County ZIP code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          description: formDescription,
          zipCode: formZipCode
        })
      });

      if (response.ok) {
        const data: AnonymousReport = await response.json();
        setSubmitSuccess(data);
        setFormDescription('');
        setFormZipCode('');
        fetchReports(); // Refresh local list
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to submit report');
      }
    } catch (err) {
      setError('Connection issue. Please call the Harris Center Helpline at 713-970-7000 if this is an active emergency.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!trackIdQuery.trim()) {
      setTrackerError('Please enter a Reference ID');
      return;
    }

    setTrackerError(null);
    setTrackedReport(null);

    try {
      const formattedId = trackIdQuery.trim().toUpperCase();
      const response = await fetch(`/api/reports/${formattedId}`);
      if (response.ok) {
        const data = await response.json();
        setTrackedReport(data);
      } else {
        setTrackerError('No report found matching that Reference ID.');
      }
    } catch (err) {
      setTrackerError('Failed to retrieve status. Try again.');
    }
  };

  const categories = [
    'Anxiety / Panic Attack',
    'Depression',
    'Self Harm / Suicide Ideation',
    'Substance Use Crisis',
    'Other Mental Health Crisis'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Form Area - 2 Cols on large screens */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Success State */}
        {submitSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-6 sm:p-8 rounded-2xl space-y-4 transition-colors">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-800 dark:text-emerald-300 w-fit">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Anonymous Report Filed Successfully
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Your report has been entered into the Harris County mental health navigator queue. It has been stripped of any metadata and is completely secure.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                Your Secure Reference ID:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {submitSuccess.id}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(submitSuccess.id);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 min-h-[40px] flex items-center"
                >
                  Copy ID
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                **SAVE THIS ID.** Use it in the "Report Follow-up Tracker" panel to securely check for responses, dispatched MCOT notes, or referral guidelines without exposing your identity.
              </p>
            </div>

            <button
              onClick={() => setSubmitSuccess(null)}
              className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <span>Submit another report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Submission Form */
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 transition-colors">
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  File an Anonymous Crisis Report
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Alert a local mental health navigator to a non-emergency or community distress scenario.
                </p>
              </div>
            </div>

            {/* Privacy Alert */}
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-300">
              <Shield className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
              <p>
                <strong>Privacy Protocol:</strong> No names, email addresses, phone numbers, or IP telemetry logs are saved. All descriptions are analyzed locally for PII and redactable details before being logged.
              </p>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Crisis Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* ZIP Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Harris County ZIP Code of Crisis
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. 77072"
                  value={formZipCode}
                  onChange={(e) => setFormZipCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all min-h-[44px]"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Describe the Crisis Scenario</span>
                  <span className="text-[10px] text-zinc-400 font-normal normal-case">Avoid using real names</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell our clinical navigators what is happening, what resources are needed, or what sliding scale counseling services you are trying to help them locate..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-zinc-50 focus:bg-white dark:bg-zinc-900 dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                id="btn-submit-report"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Securely...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit Anonymous Report</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Public sanitized feed */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Active Local Navigation Feed (County Public)
          </h4>
          
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No active community navigation events in queue.</p>
            ) : (
              reports.map(rep => (
                <div
                  key={rep.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Ref: {rep.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rep.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                      rep.status === 'MCOT Dispatched' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium">Category: {rep.category}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 italic">" {rep.description.length > 120 ? rep.description.substring(0, 120) + '...' : rep.description} "</p>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/60">
                    <span>ZIP Area: {rep.zipCode}</span>
                    <span>{new Date(rep.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Side Column - Follow-up Tracker & Helpline Box */}
      <div className="space-y-6">
        
        {/* Tracker Panel */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Report Follow-up Tracker
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Enter your <strong>Reference ID</strong> to securely view progress updates, dispatched responder logs, or clinician referrals left for you anonymously.
          </p>

          <form onSubmit={handleTrackReport} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. HARRI-12490"
              value={trackIdQuery}
              onChange={(e) => setTrackIdQuery(e.target.value)}
              className="flex-1 text-sm px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 min-h-[44px] font-mono tracking-wider"
              required
            />
            <button
              type="submit"
              className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all min-h-[44px]"
            >
              Track
            </button>
          </form>

          {trackerError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {trackerError}
            </p>
          )}

          {/* Tracked Report Details */}
          {trackedReport && (
            <div className="border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-4 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-100/60 dark:border-emerald-900/40 pb-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Ref ID: {trackedReport.id}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold uppercase">
                  {trackedReport.status}
                </span>
              </div>

              <div>
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">Your Sanitized Description:</span>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1 italic">
                  "{trackedReport.description}"
                </p>
              </div>

              <div className="space-y-3">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block text-[10px]">Navigation Timeline logs:</span>
                
                <div className="relative border-l-2 border-emerald-200 dark:border-emerald-800 pl-4 space-y-4">
                  {trackedReport.updates.map((upd, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[22px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-zinc-950" />
                      <span className="text-[10px] text-zinc-400 block">{new Date(upd.timestamp).toLocaleString()}</span>
                      <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed font-medium">
                        {upd.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Emergency disclaimer side banner */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm space-y-3 transition-colors text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Crisis Reporting Guidelines</span>
          </div>
          <p className="leading-relaxed">
            Anonymous reports are read by clinical navigators within 12-24 hours to monitor community stress trends and coordinate sliding-scale healthcare delivery.
          </p>
          <p className="font-semibold text-rose-600 dark:text-rose-400">
            THIS FORM IS NOT A CHAT DIRECT WITH A 911 OPERATOR.
          </p>
          <p className="leading-relaxed">
            If you are in danger of harming yourself right now, immediately call the Harris Center Crisis line directly at <strong>713-970-7000</strong> or dial <strong>988</strong>.
          </p>
        </div>

      </div>

    </div>
  );
}

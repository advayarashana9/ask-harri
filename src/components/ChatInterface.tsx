import { useState, useEffect, useRef, FormEvent } from 'react';
import { ChatMessage, Clinic } from '../types.js';
import { CLINICS } from '../data/clinics.js';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, AlertTriangle, 
  HelpCircle, Sparkles, Languages, RefreshCw, PhoneCall, PhoneOff,
  MapPin, Globe, Loader2, Play, Square, Share2, Mail, CheckCircle2, Clock, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Setup SpeechRecognition compatibility for browser STT
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface ChatInterfaceProps {
  onClinicSelect: (id: string) => void;
}

export default function ChatInterface({ onClinicSelect }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'bot-init',
      sender: 'bot',
      text: "Hello! I'm Harri, your local mental health navigator for Harris County. I can guide you to nearby clinics and resources, or simply be a patient, stigma-free listener whenever you feel isolated or overwhelmed.\n\nHow are you feeling today? You can type your response, or start a live voice call using the button above to talk to me.",
      timestamp: new Date().toISOString(),
      language: 'English'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Spanish' | 'Vietnamese' | 'Chinese'>('English');
  const [loading, setLoading] = useState(false);
  
  // Voice STT states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice TTS states
  const [isAutoSpeak, setIsAutoSpeak] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [ttsEngine, setTtsEngine] = useState<'browser' | 'gemini'>('browser');
  const [activeAudioElement, setActiveAudioElement] = useState<HTMLAudioElement | null>(null);

  // Gemini Live Voice Call States & Refs
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [liveSubtitle, setLiveSubtitle] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');
  const [liveRecommendedClinics, setLiveRecommendedClinics] = useState<Clinic[]>([]);

  const isMutedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  // --- DYNAMIC DISPATCH STATES ---
  const [showManualDispatchModal, setShowManualDispatchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [manualDispatchSummary, setManualDispatchSummary] = useState('');
  const [recipientInput, setRecipientInput] = useState('openroboticsai@gmail.com');
  const [mediumChoice, setMediumChoice] = useState<'email'>('email');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatusMessage, setDispatchStatusMessage] = useState('');
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [lastActiveDispatch, setLastActiveDispatch] = useState<any | null>(null);
  const [emailSynced, setEmailSynced] = useState(false);

  const handleUpdateRecipientEmail = (email: string) => {
    setRecipientInput(email);
    setEmailSynced(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ email: email.trim() }));
    }
  };

  const confirmEmailSync = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ email: recipientInput.trim() }));
    }
    setEmailSynced(true);
    setTimeout(() => {
      setEmailSynced(false);
    }, 4000);
  };

  const fetchDispatchLogs = async () => {
    try {
      const res = await fetch('/api/dispatches');
      if (res.ok) {
        const data = await res.json();
        setDispatchLogs(data);
      }
    } catch (err) {
      console.error('Failed to load dispatch logs:', err);
    }
  };

  useEffect(() => {
    fetchDispatchLogs();
  }, []);

  // Match clinics dynamically in real time from live call transcript subtitle streams
  useEffect(() => {
    if (!isCallActive) {
      setLiveRecommendedClinics([]);
      return;
    }

    const combinedText = `${userSubtitle} ${liveSubtitle}`.toLowerCase();
    if (!combinedText.trim()) return;

    // Define broad keyword checks (especially phonetic spelling or common mis-transcriptions for Alief)
    const matchesAlief = combinedText.includes('alief') || 
                         combinedText.includes('alif') || 
                         combinedText.includes('aleef') || 
                         combinedText.includes('allief') || 
                         combinedText.includes('a leaf') ||
                         combinedText.includes('77072') ||
                         combinedText.includes('77036') ||
                         combinedText.includes('77099');

    const matchesEastEnd = combinedText.includes('east end') || 
                           combinedText.includes('eastend') || 
                           combinedText.includes('77011') || 
                           combinedText.includes('77012');

    setLiveRecommendedClinics(prev => {
      const currentIds = new Set(prev.map(c => c.id));
      const newlyMatched = CLINICS.filter(clinic => {
        if (currentIds.has(clinic.id)) return false;

        const nameLower = clinic.name.toLowerCase();
        
        // Match specific clinic keywords
        if (nameLower.includes('hope clinic') && (combinedText.includes('hope clinic') || matchesAlief || combinedText.includes('corporate'))) {
          return true;
        }
        if ((nameLower.includes('mha') || nameLower.includes('mental health america')) && (combinedText.includes('mha') || combinedText.includes('mental health america') || combinedText.includes('norfolk') || combinedText.includes('houston association'))) {
          return true;
        }
        if ((nameLower.includes('centro de') || nameLower.includes('corazón') || nameLower.includes('corazon')) && 
            (combinedText.includes('centro') || combinedText.includes('corazon') || combinedText.includes('corazón') || matchesEastEnd || combinedText.includes('capitol'))) {
          return true;
        }
        if (nameLower.includes('bpsos') && (combinedText.includes('bpsos') || combinedText.includes('boat people') || combinedText.includes('bellaire') || matchesAlief)) {
          return true;
        }
        if ((nameLower.includes('vn teamwork') || clinic.id === 'vn-teamwork') && (combinedText.includes('vn teamwork') || combinedText.includes('teamwork') || matchesAlief)) {
          return true;
        }
        if ((nameLower.includes('neuropsychiatric') || clinic.id === 'harris-center-npc') && 
            (combinedText.includes('neuropsychiatric') || combinedText.includes('npc') || combinedText.includes('ben taub') || combinedText.includes('emergency room') || combinedText.includes('psychiatric emergency'))) {
          return true;
        }
        if ((nameLower.includes('mobile crisis') || clinic.id === 'harris-center-mcot') && 
            (combinedText.includes('mcot') || combinedText.includes('mobile crisis') || combinedText.includes('outreach team') || combinedText.includes('dispatched'))) {
          return true;
        }
        if ((nameLower.includes('helpline') || clinic.id === 'harris-center-helpline') && 
            (combinedText.includes('helpline') || combinedText.includes('crisis line') || combinedText.includes('crisis support') || combinedText.includes('phone triage'))) {
          return true;
        }
        if (nameLower.includes('cypress creek') && (combinedText.includes('cypress creek') || combinedText.includes('cypress'))) {
          return true;
        }
        if (nameLower.includes('west oaks') && (combinedText.includes('west oaks') || combinedText.includes('westoaks'))) {
          return true;
        }
        if (nameLower.includes('houston behavioral') && combinedText.includes('houston behavioral')) {
          return true;
        }
        if (nameLower.includes('sun behavioral') && combinedText.includes('sun behavioral')) {
          return true;
        }

        // Match based on ZIP codes
        if (clinic.zipCodes) {
          const zipMatch = clinic.zipCodes.some(zip => combinedText.includes(zip));
          if (zipMatch) return true;
        }

        return false;
      });

      if (newlyMatched.length > 0) {
        return [...prev, ...newlyMatched];
      }
      return prev;
    });
  }, [userSubtitle, liveSubtitle, isCallActive]);

  const generateAutomaticSummary = () => {
    let summaryText = `HARRIS COUNTY CARE NAVIGATION SUMMARY\nCompiled by Harri, your AI Care Navigator\nDate: ${new Date().toLocaleDateString()}\n\n`;
    
    const clinicIds = new Set<string>();
    messages.forEach(m => {
      if (m.suggestedClinics) {
        m.suggestedClinics.forEach(id => clinicIds.add(id));
      }
      
      // Safety/fallback: scan the transcript text for clinic mentions
      if (m.text) {
        const lowerText = m.text.toLowerCase();
        if (lowerText.includes('halifax')) {
          clinicIds.add('halifax-neighborhood-center');
        }
        if (lowerText.includes('hope clinic')) {
          clinicIds.add('hope-clinic-main');
        }
        if (lowerText.includes('centro de coraz') || lowerText.includes('centro de corazón')) {
          clinicIds.add('el-centro-de-corazon');
        }
        if (lowerText.includes('boat people') || lowerText.includes('bpsos')) {
          clinicIds.add('bpsos-houston');
        }
        if (lowerText.includes('vn teamwork')) {
          clinicIds.add('vn-teamwork');
        }
        if (lowerText.includes('neuropsychiatric') || lowerText.includes('npc')) {
          clinicIds.add('harris-center-npc');
        }
        if (lowerText.includes('mcot') || lowerText.includes('mobile crisis')) {
          clinicIds.add('harris-center-mcot');
        }
        if (lowerText.includes('mha') || lowerText.includes('mental health america')) {
          clinicIds.add('mha-greater-houston');
        }
        if (lowerText.includes('cypress creek')) {
          clinicIds.add('cypress-creek-hospital');
        }
        if (lowerText.includes('west oaks')) {
          clinicIds.add('west-oaks-hospital');
        }
        if (lowerText.includes('houston behavioral')) {
          clinicIds.add('houston-behavioral-health');
        }
        if (lowerText.includes('sun behavioral')) {
          clinicIds.add('sun-behavioral-houston');
        }
      }
    });

    if (clinicIds.size > 0) {
      summaryText += `RECOMMENDED CERTIFIED CLINICS:\n`;
      summaryText += `===============================\n\n`;
      clinicIds.forEach(id => {
        const clinic = CLINICS.find(c => c.id === id);
        if (clinic) {
          summaryText += `• ${clinic.name}\n`;
          summaryText += `  Type: ${clinic.type}\n`;
          summaryText += `  Address: ${clinic.address}\n`;
          summaryText += `  Phone: ${clinic.phone}\n`;
          summaryText += `  Cost: ${clinic.costInfo}\n`;
          summaryText += `  Hours: ${clinic.hours}\n`;
          if (clinic.website && clinic.website !== '#') {
            summaryText += `  Website: ${clinic.website}\n`;
          }
          summaryText += `\n`;
        }
      });
    } else {
      summaryText += `Care navigation discussion summary:\n`;
      const userLines = messages.filter(m => m.sender === 'user').slice(-3);
      if (userLines.length > 0) {
        summaryText += `Your interest: ${userLines.map(l => l.text).join('; ')}\n\n`;
      }
      summaryText += `General Resources discussed:\n`;
      summaryText += `• The Harris Center 24/7 Helpline: 713-970-7000\n`;
      summaryText += `• Crisis Support: Call or text 988\n\n`;
    }

    summaryText += `RECOMMENDED CARE STEPS:\n`;
    summaryText += `1. Review the clinic locations above and check their sliding-scale eligibility.\n`;
    summaryText += `2. Call to set up an intake appointment, or walk in during specified intake hours.\n`;
    summaryText += `3. Bring your ID, proof of residency (e.g., utility bill), and proof of income (if seeking sliding scale).\n`;
    
    return summaryText;
  };

  const handleManualSend = async () => {
    if (!recipientInput.trim() || !manualDispatchSummary.trim()) return;
    setIsDispatching(true);
    setDispatchStatusMessage('');

    try {
      const response = await fetch('/api/send-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipientInput,
          medium: mediumChoice,
          summary: manualDispatchSummary
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDispatchStatusMessage(data.message);
        fetchDispatchLogs(); // refresh log history

        if (data.status === 'sent' || data.status === 'simulated') {
          // Set live success dispatch card for elegant visual feedback
          setLastActiveDispatch({
            recipient: recipientInput,
            medium: 'email',
            status: data.status,
            message: data.message
          });
          setTimeout(() => {
            setLastActiveDispatch(null);
          }, 6000);

          setTimeout(() => {
            setShowManualDispatchModal(false);
            setRecipientInput('openroboticsai@gmail.com');
          }, 2000);
        }
      } else {
        const err = await response.json();
        setDispatchStatusMessage(`Error: ${err.error || 'Failed to dispatch care plan.'}`);
      }
    } catch (err: any) {
      setDispatchStatusMessage(`Error connecting to server: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle language switch greetings
  const handleLanguageChange = (lang: 'English' | 'Spanish' | 'Vietnamese' | 'Chinese') => {
    setSelectedLanguage(lang);
    let greeting = '';
    if (lang === 'English') {
      greeting = "Hello! I am Harri, your local resource navigator. I speak English, Spanish, Vietnamese, and Chinese. How can I guide you to care today?";
    } else if (lang === 'Spanish') {
      greeting = "¡Hola! Soy Harri, su orientador local de recursos de salud mental. Hablo español, inglés, vietnamita y chino. ¿Cómo puedo guiarle hacia la atención médica hoy?";
    } else if (lang === 'Vietnamese') {
      greeting = "Xin chào! Tôi là Harri, chuyên viên điều hướng nguồn lực sức khỏe tâm thần tại Quận Harris. Tôi nói tiếng Việt, tiếng Anh, tiếng Tây Ban Nha và tiếng Trung. Tôi có thể hướng dẫn bạn nhận được sự chăm sóc y tế nào hôm nay?";
    } else if (lang === 'Chinese') {
      greeting = "您好！我是 Harri，您在哈里斯郡（Harris County）的本地精神健康和资源导航员。我提供中文、英文、西班牙文和越南文服务。今天我该如何引导您寻找医疗护理？";
    }

    setMessages(prev => [
      ...prev,
      {
        id: `lang-greeting-${Date.now()}`,
        sender: 'bot',
        text: greeting,
        timestamp: new Date().toISOString(),
        language: lang
      }
    ]);

    // Speak greeting if autospeak is on
    if (isAutoSpeak) {
      speakText(greeting, lang);
    }
  };

  // --- Voice Input (STT) SpeechRecognition Logic ---
  useEffect(() => {
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputText(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!SpeechRecognitionAPI) {
      alert('Speech Recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      // Configure language before listening
      if (selectedLanguage === 'Spanish') recognitionRef.current.lang = 'es-US';
      else if (selectedLanguage === 'Vietnamese') recognitionRef.current.lang = 'vi-VN';
      else if (selectedLanguage === 'Chinese') recognitionRef.current.lang = 'zh-CN';
      else recognitionRef.current.lang = 'en-US';

      recognitionRef.current?.start();
    }
  };

  // --- Voice Output (TTS) Logic ---
  const stopAllSpeech = () => {
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Stop server Gemini TTS
    if (activeAudioElement) {
      activeAudioElement.pause();
      setActiveAudioElement(null);
    }
    setPlayingAudioId(null);
  };

  const speakText = async (text: string, langCode: string, messageId?: string) => {
    stopAllSpeech();
    if (messageId) {
      setPlayingAudioId(messageId);
    }

    const cleanText = text.replace(/[*#`🛑📞🚨]/g, '').trim();

    if (ttsEngine === 'gemini') {
      // Use Gemini Server-Side TTS Engine
      try {
        let geminiVoice = 'Zephyr'; // Default
        if (langCode === 'Spanish') geminiVoice = 'Kore';
        else if (langCode === 'Vietnamese') geminiVoice = 'Charon';
        else if (langCode === 'Chinese') geminiVoice = 'Fenrir';

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, voice: geminiVoice })
        });

        if (response.ok) {
          const data = await response.json();
          const audioUrl = `data:audio/pcm;base64,${data.audio}`;
          
          // Re-encode PCM audio or convert to simple speech synthesis fallback if binary is unplayable
          // Note: Since standard audio elements cannot play raw 24kHz PCM without header wrappers easily,
          // we decode it dynamically, or use browser-native fallback if fetch parsing is unavailable.
          const audio = new Audio(audioUrl);
          audio.onended = () => setPlayingAudioId(null);
          audio.onerror = () => {
            // If raw PCM fails to decode, fall back gracefully to instant browser synthesis
            fallbackToBrowserTTS(cleanText, langCode);
          };
          audio.play();
          setActiveAudioElement(audio);
        } else {
          fallbackToBrowserTTS(cleanText, langCode);
        }
      } catch (err) {
        fallbackToBrowserTTS(cleanText, langCode);
      }
    } else {
      // Default: Use Local Low-Latency Browser-Native Speech Synthesis
      fallbackToBrowserTTS(cleanText, langCode);
    }
  };

  const fallbackToBrowserTTS = (text: string, langCode: string) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      setPlayingAudioId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to match the best local operating system voice
    const voices = window.speechSynthesis.getVoices();
    let bestVoice = null;

    if (langCode === 'Spanish') {
      bestVoice = voices.find(v => v.lang.startsWith('es'));
    } else if (langCode === 'Vietnamese') {
      bestVoice = voices.find(v => v.lang.startsWith('vi'));
    } else if (langCode === 'Chinese') {
      bestVoice = voices.find(v => v.lang.startsWith('zh'));
    } else {
      bestVoice = voices.find(v => v.lang.startsWith('en'));
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      setPlayingAudioId(null);
    };

    utterance.onerror = () => {
      setPlayingAudioId(null);
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // --- Gemini Live Realtime Voice Conversation Logic ---

  // Conversion helper: Float32Array to 16-bit PCM Little Endian
  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  // Conversion helper: ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Conversion helper: Base64 to Float32Array
  const base64ToFloat32 = (base64: string): Float32Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  };

  // Toggle Mute State
  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    isMutedRef.current = newVal;
  };

  // Stop active model voice playback nodes (supports instant interruption)
  const stopAllActiveNodes = () => {
    if (activeNodesRef.current) {
      activeNodesRef.current.forEach(node => {
        try {
          node.stop();
        } catch (e) {
          // ignore
        }
      });
      activeNodesRef.current = [];
    }
    nextStartTimeRef.current = 0;
  };

  // End Live Call session
  const endLiveCall = () => {
    setIsCallActive(false);
    setCallState('idle');
    setIsMuted(false);
    isMutedRef.current = false;
    setLiveSubtitle('');
    setUserSubtitle('');

    // Stop WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop microphone processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio contexts
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    // Stop active playback nodes
    stopAllActiveNodes();
  };

  // Play model output 24kHz PCM audio chunk
  const playAudioChunk = (base64Audio: string) => {
    const outputAudioCtx = outputAudioCtxRef.current;
    if (!outputAudioCtx) return;

    const float32 = base64ToFloat32(base64Audio);
    if (float32.length === 0) return;

    const audioBuffer = outputAudioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const sourceNode = outputAudioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(outputAudioCtx.destination);

    const currentTime = outputAudioCtx.currentTime;
    let nextStartTime = nextStartTimeRef.current;
    if (nextStartTime < currentTime) {
      nextStartTime = currentTime + 0.05;
    }

    sourceNode.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
    nextStartTimeRef.current = nextStartTime;

    sourceNode.onended = () => {
      if (activeNodesRef.current) {
        activeNodesRef.current = activeNodesRef.current.filter(n => n !== sourceNode);
      }
    };
    activeNodesRef.current.push(sourceNode);
  };

  // Start Live Call session
  const startLiveCall = async () => {
    try {
      setCallState('connecting');
      setIsCallActive(true);
      stopAllSpeech(); // stop any background speech synthesis

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Initialize input/output AudioContexts
      const AudioCtxConstructor = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioCtxConstructor({ sampleRate: 16000 });
      const outputAudioCtx = new AudioCtxConstructor({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputAudioCtx;
      outputAudioCtxRef.current = outputAudioCtx;

      // Reset sync states
      nextStartTimeRef.current = 0;
      activeNodesRef.current = [];

      // 3. Open full-stack WebSocket connection to proxy server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Live WS connected. Streaming microphone data...');
        setCallState('active');

        // Automatically sync email if pre-entered
        if (recipientInput.trim()) {
          ws.send(JSON.stringify({ email: recipientInput.trim() }));
        }

        // Setup processor node for audio capture
        const source = inputAudioCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputAudioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            if (isMutedRef.current) return;

            const channelData = e.inputBuffer.getChannelData(0);
            const pcmBuffer = floatTo16BitPCM(channelData);
            const base64 = arrayBufferToBase64(pcmBuffer);
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.error) {
            console.error('Server reported Live error:', msg.error);
            endLiveCall();
            return;
          }

          // Handle server-directed interruption
          if (msg.interrupted) {
            console.log('Gemini Live interrupted. Halting playback.');
            stopAllActiveNodes();
          }

          // Handle audio content playback
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }

          // Handle live subtitles (captions)
          if (msg.text !== undefined) {
            if (msg.isUser) {
              setUserSubtitle(msg.text);
              // Auto-clear user subtitles after 4 seconds
              setTimeout(() => setUserSubtitle(prev => prev === msg.text ? '' : prev), 4000);
            } else {
              setLiveSubtitle(msg.text);
            }
          }

          // Handle live tool calls (dispatch summaries) triggered by the voice call
          if (msg.dispatchNotification) {
            console.log('Realtime summary dispatch received:', msg.dispatchNotification);
            setLastActiveDispatch(msg.dispatchNotification);
            fetchDispatchLogs(); // trigger state refresh

            // Automatically clear success state after 6 seconds to reset the screen
            setTimeout(() => {
              setLastActiveDispatch(prev => prev === msg.dispatchNotification ? null : prev);
            }, 6000);
          }

        } catch (e) {
          console.error('Error parsing server websocket frame:', e);
        }
      };

      ws.onclose = () => {
        console.log('Live WS closed by proxy server.');
        endLiveCall();
      };

      ws.onerror = (err) => {
        console.error('Live WS encountered an error:', err);
        endLiveCall();
      };

    } catch (err) {
      console.error('Failed to initiate live voice connection:', err);
      alert('Could not start real-time voice call. Please check microphone permissions and try again.');
      setIsCallActive(false);
      setCallState('idle');
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      endLiveCall();
    };
  }, []);

  // --- Send Message Handler ---
  const handleSendMessage = async (e?: FormEvent, forceText?: string) => {
    if (e) e.preventDefault();
    const queryText = forceText || inputText;
    if (!queryText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    stopAllSpeech();

    try {
      // Build brief chat history to send to server for contextual conversation
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse: ChatMessage = data.botResponse;

        setMessages(prev => [...prev, botResponse]);

        // Auto speak if toggled
        if (isAutoSpeak) {
          speakText(botResponse.text, botResponse.language || selectedLanguage, botResponse.id);
        }
      } else {
        throw new Error('Server issues');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: "I am having difficulty connecting with the Harris County navigator network. If you are experiencing a severe emergency, please dial **713-970-7000** immediately.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger hard crisis demo
  const triggerCrisisDemo = () => {
    handleSendMessage(undefined, "I want to end my life, can't take it anymore");
  };

  return (
    <>
    <div className="flex flex-col h-[650px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
      
      {/* Chat Sub-Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Language selector chips */}
        <div className="flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-500 mr-1 hidden sm:inline">Translate:</span>
          {(['English', 'Spanish', 'Vietnamese', 'Chinese'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedLanguage === lang
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {lang === 'Spanish' ? 'Español' : lang === 'Vietnamese' ? 'Tiếng Việt' : lang === 'Chinese' ? '中文' : lang}
            </button>
          ))}
        </div>

        {/* Gemini Live Voice Call Button (Centered / Right of Language Selector) */}
        <button
          onClick={isCallActive ? endLiveCall : startLiveCall}
          className={`flex items-center gap-2 text-xs px-5 py-2.5 rounded-xl border font-extrabold transition-all transform hover:scale-105 active:scale-95 shadow-md ${
            isCallActive
              ? 'bg-rose-600 border-rose-700 text-white animate-pulse hover:bg-rose-700 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400 text-white hover:from-emerald-500 hover:to-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
          }`}
          title="Start low-latency natural voice conversation with Harri"
        >
          <PhoneCall className="w-4 h-4 animate-bounce" />
          <span className="tracking-wide">{isCallActive ? 'End Live Call' : 'Start Live Call (Recommended)'}</span>
        </button>

        {/* Voice accessibility toggles */}
        <div className="flex items-center gap-2">
          {/* TTS Engine Selector */}
          <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setTtsEngine('browser')}
              className={`px-2 py-0.5 rounded-md ${ttsEngine === 'browser' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
              title="Low-latency local voice synthesizer"
            >
              Local Voice
            </button>
            <button
              onClick={() => setTtsEngine('gemini')}
              className={`px-2 py-0.5 rounded-md ${ttsEngine === 'gemini' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
              title="HD Voice generated by Gemini TTS"
            >
              Gemini HD
            </button>
          </div>

          {/* Auto speak button */}
          <button
            onClick={() => {
              setIsAutoSpeak(!isAutoSpeak);
              if (isAutoSpeak) stopAllSpeech();
            }}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all min-h-[36px] ${
              isAutoSpeak 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' 
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title="Read Harri's responses aloud automatically"
          >
            {isAutoSpeak ? <Volume2 className="w-3.5 h-3.5 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isAutoSpeak ? 'Hands-Free On' : 'Read Aloud'}</span>
          </button>

          {/* Share Care Plan Button */}
          <button
            onClick={() => {
              const summary = generateAutomaticSummary();
              setManualDispatchSummary(summary);
              setShowManualDispatchModal(true);
              setDispatchStatusMessage('');
            }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200/40 dark:border-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold transition-all min-h-[36px]"
            title="Send a custom care plan of discussed clinics to your email"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Care Plan</span>
          </button>
        </div>

      </div>

      {/* Live Voice Call Screen Overlay */}
      {isCallActive ? (
        <div className="flex-1 bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
          
          {/* Glowing background ambience */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-emerald-950)_0%,transparent_60%)] opacity-40 pointer-events-none" />

          {/* Realtime Floating Dispatch Success Toast (Absolute overlay, avoids vertical squishing) */}
          <AnimatePresence>
            {lastActiveDispatch && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: -10, x: "-50%", scale: 0.95 }}
                className="absolute top-16 left-1/2 w-[90%] max-w-sm bg-zinc-900/95 border border-emerald-500/40 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 z-30 backdrop-blur-md"
                style={{ transform: "translateX(-50%)" }}
              >
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-sm font-extrabold text-emerald-300">Summary Sent Real-Time!</h4>
                  <p className="text-xs text-emerald-100/90 leading-relaxed mt-1">
                    Harri successfully sent the clinic care navigation guidelines via <b>{lastActiveDispatch.medium === 'email' ? 'Email' : 'SMS Text'}</b> to:
                  </p>
                  <p className="text-xs font-mono bg-black/40 px-2 py-1 rounded-md text-emerald-200 mt-1.5 truncate">
                    {lastActiveDispatch.recipient}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    ({lastActiveDispatch.status === 'simulated' ? 'Preview Mode: Send Simulated' : 'Delivered securely'})
                  </p>
                </div>
                <button
                  onClick={() => setLastActiveDispatch(null)}
                  className="absolute top-2 right-2.5 text-zinc-400 hover:text-white font-bold p-1"
                >
                  &times;
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Call Header */}
          <div className="z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                {callState === 'connecting' ? 'Connecting to Harri...' : 'Live Call Active'}
              </span>
            </div>
            <div className="text-[10px] bg-zinc-800 text-zinc-300 font-bold px-2 py-1 rounded-md">
              Gemini Live v3.1
            </div>
          </div>

          {/* Main call workspace (fully centered layout without recommendations) */}
          <div className="z-10 flex-1 flex flex-col items-center justify-center space-y-6 w-full max-w-xl mx-auto overflow-hidden min-h-0">
            
            {/* Animated Pulsing Avatar Ring */}
            <div className="relative">
              <motion.div
                animate={{
                  scale: callState === 'active' && !isMuted ? [1, 1.2, 1] : 1,
                  opacity: callState === 'active' && !isMuted ? [0.15, 0.35, 0.15] : 0.15,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 -m-6 rounded-full bg-emerald-500/20 blur-xl"
              />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-2 border-emerald-400">
                H
              </div>
            </div>

            {/* Speaking Status / Live Subtitles */}
            <div className="text-center max-w-sm space-y-3 px-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Harri Voice Assistant
              </h3>
              
              {/* Dynamic Subtitle captions from real-time Live transcription */}
              <div className="min-h-[50px] flex items-center justify-center">
                {liveSubtitle ? (
                  <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed font-medium bg-emerald-950/40 px-4 py-2.5 rounded-xl border border-emerald-900/40">
                    "{liveSubtitle}"
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    {callState === 'connecting' 
                      ? 'Establishing low-latency voice connection...' 
                      : isMuted 
                        ? 'Microphone muted. Tap unmute to speak.' 
                        : 'Listening... Talk naturally. Harri will reply instantly.'}
                  </p>
                )}
              </div>
            </div>

            {/* Bouncing Audio Waveform */}
            {callState === 'active' && !isMuted && (
              <div className="flex items-center gap-1 h-8">
                {[1, 2.5, 4, 1.5, 3.5, 2, 4.5, 1, 3, 2, 3.5, 1.5, 4.5, 2].map((val, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      height: [val * 3, val * 6, val * 3],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + (idx * 0.05),
                      ease: "easeInOut"
                    }}
                    className="w-1 bg-emerald-400 rounded-full"
                    style={{ height: `${val * 4}px` }}
                  />
                ))}
              </div>
            )}


            {/* Live Caption of last user input */}
            {userSubtitle && (
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 max-w-sm w-full text-center">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">You Said:</span>
                <p className="text-xs text-zinc-300 italic">"{userSubtitle}"</p>
              </div>
            )}

            {/* Recipient Email for Care Plan summary */}
            <div className="w-full max-w-sm bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 mt-2 text-left space-y-1.5 z-10">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Recipient Email (For Live Summary Delivery)</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmEmailSync();
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => handleUpdateRecipientEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="flex-1 bg-black/60 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all min-h-[32px]"
                />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 min-h-[32px] flex items-center gap-1 ${
                    emailSynced
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {emailSynced ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              </form>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Press <b>Enter</b> or click <b>Apply</b> to save and verify your email destination. Harri will deliver your real-time summary here.
              </p>
            </div>

          </div>

          {/* Call Controls Bar */}
          <div className="z-10 flex items-center justify-center gap-6 mt-4 pb-2">
            
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all border ${
                isMuted
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400 hover:bg-rose-600/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={endLiveCall}
              className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 border border-rose-500"
              title="End conversation"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

          </div>

        </div>
      ) : (
        <>
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/10">
            
            {/* Live Call Highlight Banner */}
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3 text-xs">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <PhoneCall className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-1 text-left">
                  <p className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">Speak with Harri Live (Recommended)</p>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Avoid typing! Tap the <strong>Live Call</strong> button to talk to Harri naturally. She will answer your questions and can email a personalized care summary straight to your inbox at the end.
                  </p>
                </div>
              </div>
              <button
                onClick={startLiveCall}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0 self-stretch md:self-auto justify-center min-h-[44px] animate-bounce"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span>Start Live Call Now</span>
              </button>
            </div>

            {/* Intro Tip Box */}
            <div className="p-3 bg-zinc-100/55 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-xl flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <HelpCircle className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>Navigation Assistance:</strong> You can ask me things like <em>"I live in Alief and need counseling"</em>, <em>"How do I request an MCOT team?"</em>, or <em>"Hablan español en El Centro de Corazón?"</em>.
              </p>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isBot = msg.sender === 'bot';
                const isPlaying = playingAudioId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      {isBot && (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold text-sm shadow-xs border border-emerald-200/20">
                          H
                        </div>
                      )}

                      <div className="space-y-2">
                        {/* Message content bubble */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap relative shadow-xs ${
                            isBot
                              ? msg.isCrisis
                                ? 'bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500 text-rose-950 dark:text-rose-100'
                                : 'bg-emerald-50/70 dark:bg-zinc-900 border border-emerald-100/60 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100'
                              : 'bg-emerald-600 text-white rounded-br-none shadow-sm font-medium'
                          }`}
                        >
                          {msg.text}

                          {/* Manual Read Aloud controls for bot responses */}
                          {isBot && (
                            <div className="absolute right-2 top-2">
                              <button
                                onClick={() => {
                                  if (isPlaying) {
                                    stopAllSpeech();
                                  } else {
                                    speakText(msg.text, msg.language || 'English', msg.id);
                                  }
                                }}
                                className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isPlaying ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'}`}
                                title="Speak message"
                              >
                                {isPlaying ? <Square className="w-3.5 h-3.5 fill-emerald-600" /> : <Play className="w-3.5 h-3.5 fill-zinc-400" />}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Grounded RAG recommendations render inside the chat feedback loop */}
                        {isBot && msg.suggestedClinics && msg.suggestedClinics.length > 0 && (
                          <div className="flex flex-col gap-2 pt-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Suggested Local Clinics:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.suggestedClinics.map(clinicId => {
                                const clinic = CLINICS.find(c => c.id === clinicId);
                                if (!clinic) return null;
                                return (
                                  <button
                                    key={clinicId}
                                    onClick={() => onClinicSelect(clinicId)}
                                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-600 transition-all text-left flex items-start gap-2 group min-h-[44px]"
                                  >
                                    <div className="p-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
                                      {clinic.isEmergency ? (
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                      ) : (
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-emerald-600 transition-colors">
                                        {clinic.name}
                                      </h4>
                                      <p className="text-[10px] text-zinc-500 truncate">{clinic.phone}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 pl-11">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>Harri is matching resources...</span>
                </div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Voice listening waveform overlay */}
          {isListening && (
            <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-rose-200 animate-bounce" />
                <span>Listening... Speak clearly into your microphone</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                  <span key={i} className="w-0.5 bg-white" style={{ height: `${h * 3}px` }} />
                ))}
              </div>
              <button
                onClick={toggleListening}
                className="text-[10px] px-2 py-0.5 bg-emerald-800 hover:bg-emerald-950 rounded-md border border-emerald-700 font-bold"
              >
                Done
              </button>
            </div>
          )}

          {/* Input Tray */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-3">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              
              {/* Hands-free Microphone button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl border transition-all shrink-0 min-w-[46px] min-h-[46px] flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                    : 'bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
                title="Hands-free dictation"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-500" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder={isListening ? "Listening to your voice..." : "Ask Harri about sliding scale clinics, MCOT team support..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isListening}
                className="flex-1 text-sm px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 min-h-[46px] disabled:opacity-50"
              />

              {/* Send Submit Button */}
              <button
                type="submit"
                disabled={loading || isListening || !inputText.trim()}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-40 transition-all shrink-0 min-w-[46px] min-h-[46px] flex items-center justify-center"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

            {/* Demo shortcuts & helpline footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/40 text-[10px] text-zinc-500">
              <div className="flex flex-wrap items-center gap-3.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <button
                    type="button"
                    onClick={triggerCrisisDemo}
                    className="hover:underline text-rose-600 dark:text-rose-400 font-semibold"
                  >
                    Test Safety Guardrail (Simulate Suicidal Keywords)
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <button
                    type="button"
                    onClick={() => {
                      fetchDispatchLogs();
                      setShowHistoryModal(true);
                    }}
                    className="hover:underline text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"
                  >
                    <span>View Sent Summaries</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-md font-extrabold text-[9px]">
                      {dispatchLogs.length}
                    </span>
                  </button>
                </div>
              </div>
              <span className="hidden lg:inline text-zinc-400 dark:text-zinc-600">Answers grounded in certified Harris Co. Health Database</span>
            </div>

          </div>
        </>
      )}

    </div>

    {/* --- SHARE CARE PLAN MODAL --- */}
    <AnimatePresence>
      {showManualDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl"
          >
            <div className="px-5 py-4 bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">Share Care Plan Summary</h3>
              </div>
              <button
                onClick={() => setShowManualDispatchModal(false)}
                className="text-white hover:text-emerald-100 font-bold text-xl p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-zinc-800 dark:text-zinc-200">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed text-left">
                Harri compiles all clinic recommendations, service lines, addresses, and crisis numbers discussed in your session into a secure, private summary sent directly to your email.
              </p>

              {/* Input field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  placeholder="yourname@example.com"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  className="w-full text-sm px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
                />
              </div>

              {/* Summary preview */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Care Plan Preview</label>
                  <button
                    type="button"
                    onClick={() => setManualDispatchSummary(generateAutomaticSummary())}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Regenerate From Chat</span>
                  </button>
                </div>
                <textarea
                  value={manualDispatchSummary}
                  onChange={(e) => setManualDispatchSummary(e.target.value)}
                  rows={6}
                  className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100 font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Status indicator */}
              {dispatchStatusMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold text-left border ${
                  dispatchStatusMessage.includes('successfully') || dispatchStatusMessage.includes('simulated')
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                }`}>
                  {dispatchStatusMessage}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2.5">
              <button
                onClick={() => setShowManualDispatchModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSend}
                disabled={isDispatching || !recipientInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-40 flex items-center gap-1.5 min-h-[36px]"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Care Plan</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* --- SENT SUMMARIES HISTORY LOG VIEWER MODAL --- */}
    <AnimatePresence>
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl"
          >
            <div className="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">Sent Care Summaries Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold text-xl p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {dispatchLogs.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30 text-zinc-400" />
                  <p className="text-sm font-semibold">No summaries sent yet in this session</p>
                  <p className="text-xs mt-1">Ask Harri during your live voice call or click "Share Care Plan" in the header!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 text-left"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            log.medium === 'email'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {log.medium === 'email' ? '📧 Email' : '💬 SMS Text'}
                          </span>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                            {log.recipient}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[9px] font-bold ${
                            log.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {log.status === 'sent' ? 'SMTP/Twilio Sent' : 'Simulated Send'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50 max-h-[120px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {log.summary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                onClick={fetchDispatchLogs}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 min-h-[36px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Log</span>
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg shadow-sm min-h-[36px]"
              >
                Close History
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

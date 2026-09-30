import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { CLINICS } from './src/data/clinics.js';
import { Clinic, AnonymousReport, ChatMessage } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK securely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  console.log('Gemini AI SDK successfully initialized server-side.');
} else {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set. Chatbot will run in demo/offline mode.');
}

// Local path for persistence of anonymous crisis reports
const REPORTS_FILE_PATH = path.resolve(process.cwd(), 'reports.json');

// Helper to read anonymous reports safely
function readReports(): AnonymousReport[] {
  try {
    if (fs.existsSync(REPORTS_FILE_PATH)) {
      const data = fs.readFileSync(REPORTS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read reports file:', error);
  }
  return [];
}

// Helper to write anonymous reports safely
function writeReports(reports: AnonymousReport[]) {
  try {
    fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write reports file:', error);
  }
}

// Ensure the reports file exists or initialize it
if (!fs.existsSync(REPORTS_FILE_PATH)) {
  writeReports([
    {
      id: 'HARRI-98214',
      category: 'Anxiety / Panic Attack',
      description: 'Need assistance navigating local counseling in the Alief area due to severe stress after a job loss. Looking for sliding scale clinics.',
      zipCode: '77072',
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      status: 'Resolved',
      updates: [
        {
          timestamp: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
          note: 'Report received anonymously. Identified HOPE Clinic Alief branch as matching candidate (multilingual and sliding-scale).'
        },
        {
          timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          note: 'Navigator followed up. Recommended HOPE Clinic. Intake completed successfully.'
        }
      ]
    },
    {
      id: 'HARRI-12490',
      category: 'Depression',
      description: 'Seeking behavioral health services for a Spanish-speaking family member in the East End ZIP 77011.',
      zipCode: '77011',
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      status: 'MCOT Dispatched',
      updates: [
        {
          timestamp: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
          note: 'Report analyzed. High score for Spanish support in East End. Forwarded details to El Centro de Corazón clinical navigation.'
        },
        {
          timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          note: 'Mobile Crisis Outreach Team (MCOT) dispatched for bilingual field evaluation in ZIP 77011.'
        }
      ]
    }
  ]);
}

// Multilingual Clinical Safety Keywords for the "MIND-SAFE" Clinical Safety Layer
const CRISIS_KEYWORDS = [
  // English
  'kill myself', 'suicide', 'want to die', 'hurt myself', 'cut myself', 'want to end it', 
  "can't take it anymore", 'end my life', 'better off dead', 'commit suicide', 'hanging myself', 
  'overdose', 'hurt my life', 'self-harm',
  // Spanish
  'suicidarme', 'suicidio', 'matarme', 'morirme', 'quiero morir', 'terminar con mi vida', 
  'no puedo mas', 'cortarme', 'hacerme daño', 'quitarme la vida', 'daño a mi mismo',
  // Vietnamese
  'tự tử', 'muốn chết', 'tự sát', 'không muốn sống', 'kết thúc cuộc đời', 'hại bản thân', 'cắt tay',
  // Chinese
  '自杀', '想死', '不想活了', '结束生命', '自残', '割腕', '我想死'
];

// Helper to analyze user input for crisis words
function checkCrisisTrigger(text: string): boolean {
  const normalizedText = text.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => normalizedText.includes(keyword));
}

// --- API ENDPOINTS ---

// 1. Get all clinics
app.get('/api/clinics', (req, res) => {
  res.json(CLINICS);
});

// 2. Submit anonymous crisis report
app.post('/api/reports', (req, res) => {
  const { category, description, zipCode } = req.body;

  if (!category || !description || !zipCode) {
    return res.status(400).json({ error: 'Missing required report fields' });
  }

  const reports = readReports();
  const newReport: AnonymousReport = {
    id: `HARRI-${Math.floor(10000 + Math.random() * 90000)}`,
    category,
    description,
    zipCode,
    timestamp: new Date().toISOString(),
    status: 'Submitted',
    updates: [
      {
        timestamp: new Date().toISOString(),
        note: 'Anonymous report successfully filed and registered in the Harris County queue.'
      }
    ]
  };

  reports.unshift(newReport); // newest first
  writeReports(reports);

  res.status(201).json(newReport);
});

// 3. Get all anonymous reports (publicly viewable safely)
app.get('/api/reports', (req, res) => {
  const reports = readReports();
  res.json(reports);
});

// 4. Get specific anonymous report status
app.get('/api/reports/:id', (req, res) => {
  const reports = readReports();
  const report = reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// 5. Add custom update note to a report (supports interaction in preview)
app.post('/api/reports/:id/update', (req, res) => {
  const { note, status } = req.body;
  if (!note) {
    return res.status(400).json({ error: 'Missing update note text' });
  }

  const reports = readReports();
  const index = reports.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const updatedReport = { ...reports[index] };
  if (status) {
    updatedReport.status = status;
  }
  updatedReport.updates.push({
    timestamp: new Date().toISOString(),
    note
  });

  reports[index] = updatedReport;
  writeReports(reports);

  res.json(updatedReport);
});

// --- HELPER FOR AI RESILIENCE AND FALLBACK ---
async function generateWithRetryAndFallback(options: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempts = 3;
    let delayMs = 500;
    
    while (attempts > 0) {
      try {
        console.log(`Attempting generateContent using model ${modelName}...`);
        
        // Timeout safeguard to prevent indefinite hanging (5 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 5000)
        );

        const response = await Promise.race([
          ai!.models.generateContent({
            model: modelName,
            contents: options.contents,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature ?? 0.7,
            }
          }),
          timeoutPromise
        ]);
        
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt with model ${modelName} failed. Remaining attempts: ${attempts - 1}. Error:`, error.message || error);
        
        const isTransient = error.message === 'TIMEOUT' ||
                            error.status === 503 || 
                            (error.status === 429) ||
                            (error.message && (
                              error.message.includes('503') || 
                              error.message.includes('temp') || 
                              error.message.includes('high demand') || 
                              error.message.includes('UNAVAILABLE') || 
                              error.message.includes('Resource exhausted') || 
                              error.message.includes('429')
                            ));
        
        if (isTransient) {
          attempts--;
          if (attempts > 0) {
            console.log(`Waiting ${delayMs}ms before retrying ${modelName}...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // exponential backoff
            continue;
          }
        }
        // Switch model immediately on non-transient or final attempt failure
        break;
      }
    }
  }

  throw lastError || new Error('All models and retries failed');
}

async function generateTTSWithRetry(text: string, voice: string) {
  let attempts = 3;
  let delayMs = 500;
  let lastError: any = null;

  while (attempts > 0) {
    try {
      console.log(`Attempting TTS generation using gemini-3.1-flash-tts-preview...`);
      
      // Timeout safeguard for TTS calls (6 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 6000)
      );

      const response = await Promise.race([
        ai!.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: `Read this text with compassionate care: ${text}` }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              }
            }
          }
        }),
        timeoutPromise
      ]);
      
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`TTS generation attempt failed. Remaining attempts: ${attempts - 1}. Error:`, error.message || error);
      
      const isTransient = error.message === 'TIMEOUT' ||
                          error.status === 503 || 
                          (error.status === 429) ||
                          (error.message && (
                            error.message.includes('503') || 
                            error.message.includes('temp') || 
                            error.message.includes('high demand') || 
                            error.message.includes('UNAVAILABLE') || 
                            error.message.includes('Resource exhausted') || 
                            error.message.includes('429')
                          ));
      
      if (isTransient) {
        attempts--;
        if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }
      }
      break;
    }
  }
  throw lastError || new Error('TTS generation failed after retries');
}

// 6. Ask Harri - AI Navigation & Support Chatbot (RAG + MIND-SAFE Guardrail)
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid text message is required' });
  }

  // --- Step 1: MIND-SAFE Clinical Safety Layer Check ---
  const isCrisisTriggered = checkCrisisTrigger(message);
  if (isCrisisTriggered) {
    const crisisResponse: ChatMessage = {
      id: `bot-crisis-${Date.now()}`,
      sender: 'bot',
      text: `🛑 **CRITICAL CRISIS PROTOCOL INITIATED** 🛑\n\nI have detected that you or someone close to you may be experiencing a severe crisis or thoughts of self-harm. Please know that you are not alone, your life has value, and help is available immediately in Harris County.\n\n### 📞 Immediate Crisis Resources:\n- **The Harris Center 24/7 Crisis Line**: Call [**713-970-7000**](tel:7139707000) immediately. They can dispatch a Mobile Crisis Outreach Team (MCOT) to support you at home without police involvement.\n- **National Suicide & Crisis Lifeline**: Dial or text [**988**](tel:988) (24/7, bilingual, fully confidential).\n- **The NeuroPsychiatric Center (NPC)**: Go directly to [**1502 Ben Taub Loop, Houston, TX 77030**](https://maps.google.com/?q=1502+Ben+Taub+Loop,+Houston,+TX+77030). This is the designated psychiatric emergency room for Harris County.\n\n*If you are in immediate danger of hurting yourself or others, please call **911** or go to the nearest emergency room immediately. I am an AI assistant and cannot replace immediate emergency medical services.*`,
      timestamp: new Date().toISOString(),
      isCrisis: true,
      suggestedClinics: ['harris-center-npc', 'harris-center-mcot', 'harris-center-helpline']
    };
    return res.json({ botResponse: crisisResponse });
  }

  // --- Step 2: RAG Context Generation (Hyperlocal Clinic Match) ---
  const normalizedMsg = message.toLowerCase();
  const matchedClinics: Clinic[] = [];

  // Semantic search heuristics
  CLINICS.forEach(clinic => {
    // Search by ZIP code match
    const zipMatch = clinic.zipCodes.some(zip => normalizedMsg.includes(zip));
    // Search by language requested
    const langMatch = clinic.languages.some(lang => {
      const lowerLang = lang.toLowerCase();
      if (lowerLang === 'spanish' && (normalizedMsg.includes('spanish') || normalizedMsg.includes('espanol') || normalizedMsg.includes('español') || normalizedMsg.includes('habla'))) return true;
      if (lowerLang === 'vietnamese' && (normalizedMsg.includes('vietnamese') || normalizedMsg.includes('tieng viet') || normalizedMsg.includes('tiếng việt') || normalizedMsg.includes('viet'))) return true;
      if (lowerLang === 'chinese' && (normalizedMsg.includes('chinese') || normalizedMsg.includes('mandarin') || normalizedMsg.includes('cantonese') || normalizedMsg.includes('中文') || normalizedMsg.includes('华语'))) return true;
      return normalizedMsg.includes(lowerLang);
    });
    // Search by service matches
    const serviceMatch = clinic.services.some(srv => normalizedMsg.includes(srv.toLowerCase()));
    
    // Search by keyword mentions (e.g. Alief, East End)
    let keywordMatch = false;
    if (normalizedMsg.includes('alief') && (clinic.id === 'hope-clinic-main' || clinic.id === 'bpsos-houston' || clinic.id === 'vn-teamwork')) keywordMatch = true;
    if (normalizedMsg.includes('east end') && clinic.id === 'el-centro-de-corazon') keywordMatch = true;
    if (normalizedMsg.includes('halifax') && clinic.id === 'halifax-neighborhood-center') keywordMatch = true;
    if ((normalizedMsg.includes('mha') || normalizedMsg.includes('mental health america')) && clinic.id === 'mha-greater-houston') keywordMatch = true;
    if (normalizedMsg.includes('cypress creek') && clinic.id === 'cypress-creek-hospital') keywordMatch = true;
    if (normalizedMsg.includes('west oaks') && clinic.id === 'west-oaks-hospital') keywordMatch = true;
    if (normalizedMsg.includes('houston behavioral') && clinic.id === 'houston-behavioral-health') keywordMatch = true;
    if (normalizedMsg.includes('sun behavioral') && clinic.id === 'sun-behavioral-houston') keywordMatch = true;
    if ((normalizedMsg.includes('uninsured') || normalizedMsg.includes('no money') || normalizedMsg.includes('no insurance') || normalizedMsg.includes('sliding scale') || normalizedMsg.includes('cost') || normalizedMsg.includes('free')) && (clinic.id === 'hope-clinic-main' || clinic.id === 'el-centro-de-corazon' || clinic.id === 'texas-211-harris')) keywordMatch = true;

    if (zipMatch || langMatch || serviceMatch || keywordMatch) {
      matchedClinics.push(clinic);
    }
  });

  // Always include standard Harris Center intake hotline as safety reference
  if (matchedClinics.length === 0) {
    matchedClinics.push(CLINICS.find(c => c.id === 'harris-center-helpline')!);
    matchedClinics.push(CLINICS.find(c => c.id === 'texas-211-harris')!);
  }

  // Create grounded context block for LLM prompt
  const contextString = matchedClinics.map(c => {
    return `Clinic Name: ${c.name}
Type: ${c.type}
Description: ${c.description}
Address: ${c.address}
Phone: ${c.phone}
Website: ${c.website}
Languages Spoken: ${c.languages.join(', ')}
Services: ${c.services.join(', ')}
Accepts Uninsured / Sliding Fee Scale: ${c.costInfo}
Hours: ${c.hours}`;
  }).join('\n\n');

  // --- Step 3: Run Gemini Generation ---
  let generatedText = '';
  const botLanguage = normalizedMsg.includes('español') || normalizedMsg.includes('espanol') ? 'Spanish' :
                      normalizedMsg.includes('tiếng việt') || normalizedMsg.includes('tieng viet') ? 'Vietnamese' :
                      normalizedMsg.includes('中文') ? 'Chinese' : 'English';

  if (ai) {
    try {
      const systemInstruction = `You are "Harri", a warm, compassionate, and culturally responsive AI Mental Health Navigator for Harris County, Texas.
Your job is to provide stigma-free, first-line emotional support and accurately guide residents to the appropriate clinical, mental health, and social services they need.

CRITICAL OPERATIONAL RULES:
1. ALWAYS respond in the language in which the user writes (English, Spanish, Vietnamese, or Chinese). If the user asks in Spanish, speak fluent Spanish. If in Vietnamese, speak fluent Vietnamese. If in Chinese, speak fluent Chinese.
2. Be highly compassionate, validating, and supportive, but clear, precise, and practical. Avoid overly dry or robotic clinical language, but also avoid diagnoses.
3. GROUND YOUR RESPONSIBLE REFERRED CARE IN THE RELEVANT CONTEXT CLINICS list provided below. Do not invent clinics or phone numbers outside of these. Give their contact numbers, addresses, and languages clearly.
4. If the user mentions external social stressors (such as rent, housing, food, job loss), direct them to "2-1-1 Texas (Harris County Resource Network)" and mention dialing 2-1-1.
5. ALWAYS maintain the distinction between emergency and non-emergency clinics:
   - For severe, acute distress (but not triggering the hard safety block), mention NPC or MCOT.
   - For primary care / counseling / immigrant groups, mention HOPE Clinic (for Asian/multi-ethnic communities) or El Centro de Corazón (for Spanish-speaking East End).
6. END your message with a gentle disclaimer: "I am Harri, your AI mental health navigator. I am here to help guide you to resources, but I am not a licensed therapist. If you are experiencing an emergency, please call 911 or the Harris Center 24/7 Crisis Line at 713-970-7000."

GROUNDING CLINICAL CONTEXT IN HARRIS COUNTY:
${contextString}`;

      // Build chat prompt and history
      const contentsParts = history.slice(-6).map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      contentsParts.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await generateWithRetryAndFallback({
        contents: contentsParts,
        systemInstruction,
        temperature: 0.7
      });

      generatedText = response.text || "I'm sorry, I encountered an issue generating a response. Please connect directly to our crisis center.";
    } catch (error) {
      console.error('Gemini call failed:', error);
      generatedText = `Hello. I am Harri, your local navigator. I am experiencing a small connection issue with my AI brain right now, but I can still tell you that you can reach out for 24/7 mental health support by calling the Harris Center Helpline at **713-970-7000** or calling **988**. For counseling services, you can visit HOPE Clinic or El Centro de Corazón. How else can I guide you today?`;
    }
  } else {
    // Fallback Mock/Offline responder when API key is missing
    generatedText = `Hi, I am Harri, your local Harris County mental health navigator. (Note: Running in offline demo mode).\n\nBased on your message, I highly recommend looking into our local partner resources:\n\n1. **The Harris Center 24/7 Helpline**: Call **713-970-7000** for direct support.\n2. **HOPE Clinic**: Perfect for multicultural care in Alief (speaks Vietnamese, Chinese, Spanish, Arabic, and 26 others). Call **713-773-0803**.\n3. **El Centro de Corazón**: Our bilingual primary Spanish hub in the East End. Call **713-926-6249**.\n4. **2-1-1 Texas**: For rental, food, and social stress support.\n\nHow can I help you navigate further?`;
  }

  const responseMessage: ChatMessage = {
    id: `bot-${Date.now()}`,
    sender: 'bot',
    text: generatedText,
    timestamp: new Date().toISOString(),
    isCrisis: false,
    language: botLanguage,
    suggestedClinics: matchedClinics.map(c => c.id)
  };

  res.json({ botResponse: responseMessage });
});

// 7. Optional Gemini HD TTS API Route
app.post('/api/voice/tts', async (req, res) => {
  const { text, voice = 'Zephyr' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for Text-To-Speech' });
  }

  if (!ai) {
    return res.status(503).json({ error: 'AI Service is unavailable/offline' });
  }

  try {
    const response = await generateTTSWithRetry(text, voice);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: 'Could not generate speech output' });
    }
  } catch (error) {
    console.error('Gemini TTS Failed:', error);
    res.status(500).json({ error: 'Gemini Text-To-Speech service error' });
  }
});


// --- DYNAMIC EMAIL & TEXT (SMS) CARE SUMMARY DISPATCHER ---

export interface DispatchLog {
  id: string;
  recipient: string;
  medium: 'email' | 'sms';
  summary: string;
  timestamp: string;
  status: 'sent' | 'simulated';
  error?: string;
}

const dispatches: DispatchLog[] = [];

async function dispatchSummary(
  recipient: string,
  medium: 'email' | 'sms',
  summary: string
): Promise<{ success: boolean; message: string; status: 'sent' | 'simulated'; error?: string }> {
  const isEmail = medium === 'email';
  const dispatchId = `DISPATCH-${Math.floor(10000 + Math.random() * 90000)}`;

  if (isEmail) {
    if (!recipient || !recipient.trim() || !recipient.includes('@')) {
      return { 
        success: false, 
        message: 'Invalid or missing email recipient address.', 
        status: 'simulated', 
        error: 'No recipients defined' 
      };
    }
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      try {
        const rawFrom = process.env.SMTP_FROM || 'Harri Care Navigator';
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawFrom);
        const fromHeader = isValidEmail 
          ? rawFrom 
          : `"${rawFrom}" <openroboticsai@gmail.com>`;

        const transporter = nodemailer.createTransport({
          host,
          port: Number(port),
          secure: Number(port) === 465,
          auth: { user, pass }
        }, {
          from: fromHeader
        });

        await transporter.sendMail({
          from: fromHeader,
          to: recipient,
          subject: 'Your Harris County Care Navigation Summary',
          text: summary,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <span style="background-color: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">Harri</span>
                <span style="margin-left: 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Harris County Mental Health Care Navigation</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 24px;">Your Requested Care Navigation Summary</h2>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.5;">Hello,</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.5;">Here is the compiled summary of clinics, phone numbers, and care steps we discussed in your navigation session:</p>
              
              <div style="background-color: #f4f4f5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0; white-space: pre-line; font-size: 14px; line-height: 1.6; color: #27272a; font-family: monospace;">
                ${summary}
              </div>

              <p style="font-size: 13px; color: #ef4444; background-color: #fef2f2; padding: 12px; border-radius: 8px; margin-top: 24px; font-weight: 500;">
                🚨 <b>If you are in distress or have thoughts of self-harm</b>, please call or text <b>988</b> (24/7 National Suicide Prevention Lifeline) or reach the Harris Center Helpline immediately at <b>713-970-7000</b>.
              </p>

              <div style="border-top: 1px solid #e4e4e7; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #71717a; text-align: center;">
                Sent securely by Harri Care Navigator • Harris County, TX.
              </div>
            </div>
          `
        });

        const log: DispatchLog = {
          id: dispatchId,
          recipient,
          medium: 'email',
          summary,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        dispatches.unshift(log);
        return { success: true, message: 'Summary email dispatched successfully via SMTP!', status: 'sent' };
      } catch (err: any) {
        console.error('SMTP send failed, falling back to simulated dispatch:', err);
        const log: DispatchLog = {
          id: dispatchId,
          recipient,
          medium: 'email',
          summary,
          timestamp: new Date().toISOString(),
          status: 'simulated',
          error: err.message
        };
        dispatches.unshift(log);
        return { success: true, message: `Email simulated successfully (SMTP error: ${err.message})`, status: 'simulated', error: err.message };
      }
    } else {
      console.log('SMTP config missing. Simulating email send to:', recipient);
      const log: DispatchLog = {
        id: dispatchId,
        recipient,
        medium: 'email',
        summary,
        timestamp: new Date().toISOString(),
        status: 'simulated'
      };
      dispatches.unshift(log);
      return { success: true, message: 'Email sent successfully in Preview Mode (simulated). SMTP credentials not configured.', status: 'simulated' };
    }
  } else {
    // SMS dispatch
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+16592517922';

    if (sid && token && fromPhone) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: recipient,
            From: fromPhone,
            Body: `Harri Care Summary:\n\n${summary}\n\nNeed urgent help? Call 988 or 713-970-7000.`
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Twilio error: ${response.status} - ${errText}`);
        }

        const log: DispatchLog = {
          id: dispatchId,
          recipient,
          medium: 'sms',
          summary,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        dispatches.unshift(log);
        return { success: true, message: 'Summary text message dispatched successfully via Twilio!', status: 'sent' };
      } catch (err: any) {
        console.error('Twilio SMS send failed, falling back to simulated dispatch:', err);
        const log: DispatchLog = {
          id: dispatchId,
          recipient,
          medium: 'sms',
          summary,
          timestamp: new Date().toISOString(),
          status: 'simulated',
          error: err.message
        };
        dispatches.unshift(log);
        return { success: true, message: `SMS simulated successfully (Twilio error: ${err.message})`, status: 'simulated', error: err.message };
      }
    } else {
      console.log('Twilio config missing. Simulating SMS send to:', recipient);
      const log: DispatchLog = {
        id: dispatchId,
        recipient,
        medium: 'sms',
        summary,
        timestamp: new Date().toISOString(),
        status: 'simulated'
      };
      dispatches.unshift(log);
      return { success: true, message: 'SMS text message sent successfully in Preview Mode (simulated). Twilio credentials not configured.', status: 'simulated' };
    }
  }
}

// REST endpoints for summary dispatches
app.post('/api/send-summary', async (req, res) => {
  const { recipient, medium, summary } = req.body;
  if (!recipient || !medium || !summary) {
    return res.status(400).json({ error: 'Missing required fields: recipient, medium, summary' });
  }

  if (medium !== 'email' && medium !== 'sms') {
    return res.status(400).json({ error: 'Invalid delivery medium. Must be "email" or "sms"' });
  }

  try {
    const result = await dispatchSummary(recipient, medium, summary);
    return res.json(result);
  } catch (err: any) {
    console.error('Dispatch endpoint failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch summary' });
  }
});

app.get('/api/dispatches', (req, res) => {
  res.json(dispatches);
});


// --- VITE DEV AND STATIC PRODUCTION ASSET ROUTING ---

const distPath = path.join(process.cwd(), 'dist');

function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/api/live-ws' });

  wss.on('connection', async (clientWs) => {
    console.log('Client connected to Gemini Live WebSocket proxy.');
    let currentSessionEmail = '';

    if (!ai) {
      console.error('Gemini Live failed: AI SDK is not initialized.');
      clientWs.send(JSON.stringify({ error: 'AI SDK not initialized on server' }));
      clientWs.close();
      return;
    }

    try {
      // Connect to Gemini Live API
      const session: any = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' } // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            }
          },
          systemInstruction: "You are Harri, a compassionate, supportive, and extremely warm bilingual (English/Spanish) mental health care navigator for Harris County, Texas. You talk with a caring tone, using short, easy-to-understand spoken phrases (since you are a live audio voice assistant). Avoid listing too many long clinical details; instead, guide the conversation interactively. Keep your responses short and naturally spoken (1-3 sentences maximum). If the user mentions extreme crisis or self-harm, gently and immediately remind them of 24/7 support by calling 988 or the Harris Center Helpline at 713-970-7000. You now also have access to the 'send_summary' tool which can send the discussed clinic resources, phone numbers, and care steps directly to the user via email! If they ask for a copy, ask them for their email ID (or tell them they can type/confirm it in the interface), and use the tool to send it. Confirm the delivery back to them once the tool returns.",
          // Enable audio transcription so the client can show subtitles/captions
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'send_summary',
                  description: 'Sends a summarized package of the clinics, phone numbers, addresses, and navigation steps discussed with the user via email. Always confirm with the user and get their email ID before calling this tool.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      recipient: {
                        type: Type.STRING,
                        description: 'The email address (e.g. user@example.com) of the recipient.'
                      },
                      summary: {
                        type: Type.STRING,
                        description: 'A friendly, highly structured care navigation summary listing clinics discussed, including addresses, phone numbers, and recommended next steps.'
                      }
                    },
                    required: ['recipient', 'summary']
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onmessage: async (message: any) => {
            // Audio content
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }

            // Real-time transcripts for live captions
            if (message.serverContent?.modelTurn) {
              const textParts = message.serverContent.modelTurn.parts?.filter((p: any) => p.text);
              if (textParts && textParts.length > 0) {
                const combined = textParts.map((p: any) => p.text).join(' ');
                clientWs.send(JSON.stringify({ text: combined, isUser: false }));
              }
            }

            if (message.serverContent?.userTurn) {
              const textParts = message.serverContent.userTurn.parts?.filter((p: any) => p.text);
              if (textParts && textParts.length > 0) {
                const combined = textParts.map((p: any) => p.text).join(' ');
                clientWs.send(JSON.stringify({ text: combined, isUser: true }));
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            // Handle live tool calls (function calling)
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const fc of functionCalls) {
                  if (fc.name === 'send_summary') {
                    let { recipient, summary } = fc.args;
                    if (currentSessionEmail) {
                      recipient = currentSessionEmail;
                    }
                    const medium = 'email';
                    console.log(`Tool call send_summary executing: recipient=${recipient}, medium=${medium}`);

                    try {
                      if (!recipient || !recipient.trim() || !recipient.includes('@')) {
                        throw new Error('No recipient email specified or the email is invalid. Please ask the user to type or say their email address first.');
                      }
                      const result = await dispatchSummary(recipient, medium, summary);

                      // Propagate real-time notification to frontend so the user gets a beautiful visual feed update
                      clientWs.send(JSON.stringify({
                        dispatchNotification: {
                          recipient,
                          medium,
                          summary,
                          status: result.status,
                          message: result.message
                        }
                      }));

                      // Return success status back to the Gemini Live session so Harri knows it went through
                      session.sendToolResponse({
                        functionResponses: [
                          {
                            name: 'send_summary',
                            id: fc.id,
                            response: { output: { success: true, message: result.message } }
                          }
                        ]
                      });
                    } catch (err: any) {
                      console.error('Error executing send_summary inside Live connection:', err);
                      session.sendToolResponse({
                        functionResponses: [
                          {
                            name: 'send_summary',
                            id: fc.id,
                            response: { output: { success: false, error: err.message } }
                          }
                        ]
                      });
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log('Successfully connected to Gemini Live Session.');

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.email) {
            currentSessionEmail = parsed.email;
            console.log(`Live session email updated to: ${currentSessionEmail}`);
          }
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          }
          if (parsed.text) {
            console.log(`Live session text input received: ${parsed.text}`);
            try {
              session.send({
                clientContent: {
                  turns: [
                    {
                      role: 'user',
                      parts: [{ text: parsed.text }]
                    }
                  ],
                  turnComplete: true
                }
              });
            } catch (err) {
              console.error('Failed to send text input to Gemini Live session:', err);
            }
          }
        } catch (err) {
          console.error('Error handling client message in WS:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('Client closed Live WebSocket proxy. Closing Gemini session.');
        session.close();
      });

      clientWs.on('error', (err) => {
        console.error('Client WS connection error:', err);
        session.close();
      });

    } catch (error) {
      console.error('Failed to establish Gemini Live connection:', error);
      clientWs.send(JSON.stringify({ error: 'Failed to connect to Gemini Live session' }));
      clientWs.close();
    }
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Serve HTML fallback for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    });
  } else {
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Setup the WebSocket Server for Gemini Live
  setupWebSocket(server);
}

startServer();

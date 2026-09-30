export interface Clinic {
  id: string;
  name: string;
  type: 'Crisis Center' | 'FQHC' | 'NGO' | 'State Designated Authority' | 'Social Services';
  description: string;
  address: string;
  phone: string;
  website: string;
  languages: string[];
  services: string[];
  zipCodes: string[];
  costInfo: string;
  hours: string;
  isEmergency: boolean;
}

export interface AnonymousReport {
  id: string;
  category: string;
  description: string;
  zipCode: string;
  timestamp: string;
  status: 'Submitted' | 'Under Review' | 'MCOT Dispatched' | 'Resolved';
  updates: Array<{
    timestamp: string;
    note: string;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isCrisis?: boolean;
  language?: string;
  suggestedClinics?: string[]; // IDs of clinics recommended
}

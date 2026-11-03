export type IncidentCategory =
  | 'medical'
  | 'fire'
  | 'accident'
  | 'earthquake'
  | 'trapped'
  | 'threat'
  | 'flood'
  | 'general';

export type AppLanguage = 'ru' | 'kz' | 'en';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface MedicalProfile {
  fullName: string;
  birthDate: string;
  bloodGroup: string;
  allergies: string;
  chronicIllness: string;
  dailyMedications: string;
  donorConsent: boolean;
  iceContacts: IceContact[];
  specialNotes: string;
}

export interface IceContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface AiTriageResponse {
  title: string;
  statusLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  immediateAction: string;
  stepByStepInstructions: string[];
  strictlyProhibited: string[];
  dispatcherBrief: string;
  cprRequired?: boolean;
  followUpCheck?: string;
}

export interface EmergencyGuideItem {
  id: string;
  category: IncidentCategory;
  title: string;
  titleKz: string;
  summary: string;
  summaryKz: string;
  iconName: string;
  phases: {
    phaseName: string;
    phaseNameKz: string;
    steps: string[];
    stepsKz: string[];
  }[];
  prohibitions: string[];
  prohibitionsKz: string[];
}

export interface GoBagItem {
  id: string;
  name: string;
  nameKz: string;
  category: 'water_food' | 'medical' | 'documents' | 'tools' | 'warmth';
  recommendedQty: string;
  checked: boolean;
}

export interface SafeShelterPoint {
  id: string;
  name: string;
  type: 'shelter' | 'hospital' | 'fire_station' | 'police' | 'aed';
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  capacity?: number;
  phone?: string;
}

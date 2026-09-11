export type Confidence = 'confirmed' | 'unclear' | 'missing';

export interface ProfileFieldValue {
  value: any;
  source_message: string;
  confidence: Confidence;
}

export interface UserProfile {
  citizenship?: ProfileFieldValue;
  disability_percentage?: ProfileFieldValue;
  medical_severity_confirmed?: ProfileFieldValue;
  state_of_residence?: ProfileFieldValue;
  age?: ProfileFieldValue;
  has_bpl_card?: ProfileFieldValue;
  receiving_other_pension?: ProfileFieldValue;
  monthly_income?: ProfileFieldValue;
  years_since_last_adip_assistance?: ProfileFieldValue;
  device_deemed_essential?: ProfileFieldValue;
  annual_family_income?: ProfileFieldValue;
  satisfactory_academic_progress?: ProfileFieldValue;
}

export type TranscriptMessage = {
  speaker: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
};

export type AgentLogEntry = {
  agent: 'Coordinator' | 'Extractor' | 'Interviewer';
  action: string;
  timestamp: string;
};

export type CaseStage = 'interviewing' | 'ready_for_eligibility' | 'escalate';

export interface CaseFile {
  id: string;
  language: 'en' | 'ml';
  consent_given: boolean;
  transcript: TranscriptMessage[];
  user_profile: UserProfile;
  flags: string[];
  stage: CaseStage;
  agent_log: AgentLogEntry[];
}

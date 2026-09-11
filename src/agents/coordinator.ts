import { CaseFile, UserProfile } from '../types/caseFile';
import { runExtractor } from './extractor';
import { runInterviewer } from './interviewer';

const REQUIRED_FIELDS: (keyof UserProfile)[] = [
  'citizenship',
  'disability_percentage',
  'state_of_residence',
  'age',
  'has_bpl_card',
  'receiving_other_pension',
  'monthly_income',
  'annual_family_income',
];

export async function runCoordinator(caseFile: CaseFile): Promise<string> {
  // 1. Run Extractor silently to update the profile based on the latest message
  await runExtractor(caseFile);

  // 2. Check for escalation criteria
  const askedForHuman = caseFile.flags.some(flag => flag.toLowerCase().includes('human') || flag.toLowerCase().includes('agent'));
  if (askedForHuman || caseFile.flags.length >= 2) {
    caseFile.stage = 'escalate';
    caseFile.agent_log.push({
      agent: 'Coordinator',
      action: 'Escalated to human due to flags or direct request.',
      timestamp: new Date().toISOString()
    });
    return "I am escalating this to a human representative to assist you further.";
  }

  // 3. Check for completeness of required fields
  const missingFields = REQUIRED_FIELDS.filter(field => {
    const data = caseFile.user_profile[field];
    return !data || data.confidence !== 'confirmed';
  });

  if (caseFile.consent_given && missingFields.length === 0) {
    caseFile.stage = 'ready_for_eligibility';
    caseFile.agent_log.push({
      agent: 'Coordinator',
      action: 'All required fields collected. Set stage to ready_for_eligibility.',
      timestamp: new Date().toISOString()
    });
    return "Thank you! I have collected all the necessary details. I will now process your case to check your eligibility for schemes.";
  }

  // 4. Run Interviewer if fields are missing or consent not yet given
  caseFile.agent_log.push({
    agent: 'Coordinator',
    action: `Missing fields: ${missingFields.length}. Calling Interviewer.`,
    timestamp: new Date().toISOString()
  });
  
  const reply = await runInterviewer(caseFile);
  return reply;
}

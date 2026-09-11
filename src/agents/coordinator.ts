import { CaseFile, UserProfile } from '../types/caseFile';
import { runExtractor } from './extractor';
import { runInterviewer } from './interviewer';
import { runQAAgent } from './qaAgent';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

async function classifyIntent(text: string): Promise<'general_question' | 'other'> {
  try {
    const prompt = `Classify this user message into ONE of two categories:
1. "general_question": The user is asking a factual question about government schemes, rules, definitions (like "What is UDID?"), or processes.
2. "other": The user is answering an interview question (giving their age, income, saying yes/no), OR asking "Am I eligible?".

Message: "${text}"

Reply ONLY with the exact category name.`;
    
    const res = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const category = res.content[0].type === 'text' ? res.content[0].text.trim() : 'other';
    return category === 'general_question' ? 'general_question' : 'other';
  } catch (e) {
    return 'other';
  }
}

export async function runCoordinator(caseFile: CaseFile): Promise<string> {
  const lastMsg = caseFile.transcript[caseFile.transcript.length - 1];
  
  // 1. Detect Intent
  const intent = await classifyIntent(lastMsg?.text || "");
  
  if (intent === 'general_question') {
    caseFile.agent_log.push({
      agent: 'Coordinator',
      action: 'Detected general question. Routing to Q&A Agent.',
      timestamp: new Date().toISOString()
    });
    
    const qaReply = await runQAAgent(caseFile);
    
    // Check if Q&A escalated
    if (qaReply.includes("connect you with a social worker") || qaReply.includes("സോഷ്യൽ വർക്കറുമായി")) {
      // Just return the fallback, wait for user to say yes/no
      return qaReply;
    }
    
    // If answered, gently continue the interview
    const continuePrompt = caseFile.language === 'ml' 
      ? " നമുക്ക് തുടരാമോ? "
      : " Shall we continue? ";
      
    // We don't want to add another message object, we'll just return it combined, 
    // or we can call the interviewer to generate the next question and append it.
    // The prompt says: "After answering, the Interviewer gently continues where it left off, e.g. "Shall we continue? You were telling me about your income.""
    // Let's call the interviewer to get the exact continuation.
    
    caseFile.agent_log.push({
      agent: 'Coordinator',
      action: 'Q&A done. Calling Interviewer to resume.',
      timestamp: new Date().toISOString()
    });
    
    // We need to inject a system instruction to the interviewer to acknowledge the detour
    // The interviewer function normally appends its reply to the transcript.
    // So we will just call it, and then combine the text for the UI response.
    const interviewReply = await runInterviewer(caseFile, true); // We'll modify interviewer to take a 'resume' flag
    return qaReply + "\n\n" + continuePrompt + interviewReply;
  }

  // Check if they are responding to the social worker prompt
  if (lastMsg?.text.toLowerCase().match(/(yes|ok|okay|sure|please|human)/) && caseFile.transcript.length >= 2) {
    const prevMsg = caseFile.transcript[caseFile.transcript.length - 2];
    if (prevMsg.speaker === 'agent' && (prevMsg.text.includes("social worker") || prevMsg.text.includes("സോഷ്യൽ വർക്കറുമായി"))) {
      caseFile.stage = 'escalate';
      return caseFile.language === 'ml' 
        ? "ശരി, ഞാൻ നിങ്ങളെ ഒരു സോഷ്യൽ വർക്കറുമായി ബന്ധിപ്പിക്കാം."
        : "Okay, I am escalating this to a human representative to assist you further.";
    }
  }

  // 2. Run Extractor silently to update the profile based on the latest message
  await runExtractor(caseFile);

  // 3. Check for escalation criteria
  const askedForHuman = caseFile.flags.some(flag => flag.toLowerCase().includes('human') || flag.toLowerCase().includes('agent'));
  if (askedForHuman || caseFile.flags.length >= 2) {
    caseFile.stage = 'escalate';
    caseFile.agent_log.push({
      agent: 'Coordinator',
      action: 'Escalated to human due to flags or direct request.',
      timestamp: new Date().toISOString()
    });
    return caseFile.language === 'ml' ? "ഞാൻ നിങ്ങളെ ഒരു സോഷ്യൽ വർക്കറുമായി ബന്ധിപ്പിക്കാം." : "I am escalating this to a human representative to assist you further.";
  }

  // 4. Check for completeness of required fields
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
    return caseFile.language === 'ml' 
      ? "നന്ദി! ഞാൻ എല്ലാ വിവരങ്ങളും ശേഖരിച്ചു. നിങ്ങളുടെ യോഗ്യത പരിശോധിക്കാൻ ഞാൻ ഇപ്പോൾ അപേക്ഷ പ്രോസസ്സ് ചെയ്യും."
      : "Thank you! I have collected all the necessary details. I will now process your case to check your eligibility for schemes.";
  }

  // 5. Run Interviewer if fields are missing or consent not yet given
  caseFile.agent_log.push({
    agent: 'Coordinator',
    action: `Missing fields: ${missingFields.length}. Calling Interviewer.`,
    timestamp: new Date().toISOString()
  });
  
  const reply = await runInterviewer(caseFile, false);
  return reply;
}

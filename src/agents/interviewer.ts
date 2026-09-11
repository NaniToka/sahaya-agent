import Anthropic from '@anthropic-ai/sdk';
import { CaseFile } from '../types/caseFile';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runInterviewer(caseFile: CaseFile): Promise<string> {
  const missingFields = Object.keys(caseFile.user_profile).filter(
    field => !caseFile.user_profile[field as keyof typeof caseFile.user_profile]?.value
  );

  let systemPrompt = `You are Sahaya, a warm and helpful AI assistant for Persons with Disabilities in Kerala.
Your goal is to collect information to determine their eligibility for various government schemes.

Rules for your responses:
1. Speak in the user's chosen language (${caseFile.language}). Handle Manglish (Malayalam written in English) naturally if the user uses it.
2. At the very start (if you haven't yet), explain what Sahaya does and ASK FOR CONSENT to collect their details. Do not ask for any other details until they consent.
3. Ask ONLY ONE question at a time.
4. Keep replies very short (1-3 sentences) because they will be spoken aloud via text-to-speech.
5. Explain difficult words (like "UDID" or "BPL") in simple language when asked.
6. STRICT: NEVER say whether the user is eligible for anything. NEVER promise benefits. NEVER ask for their full Aadhaar number.
7. Be polite and empathetic.

Current state:
Consent given: ${caseFile.consent_given}
Current profile state:
${JSON.stringify(caseFile.user_profile, null, 2)}

Missing fields you still need to ask about:
${missingFields.join(', ')}

Pick ONE missing field that makes sense to ask next and ask about it warmly. If consent is false, you MUST ask for consent first.`;

  const messages: Anthropic.MessageParam[] = caseFile.transcript.map(msg => ({
    role: msg.speaker === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I encountered an error.';
    
    caseFile.agent_log.push({
      agent: 'Interviewer',
      action: `Responded to user.`,
      timestamp: new Date().toISOString()
    });

    // Add agent reply to transcript
    caseFile.transcript.push({
      speaker: 'agent',
      text: reply,
      timestamp: new Date().toISOString()
    });

    return reply;
  } catch (err: any) {
    console.error('Interviewer error:', err);
    caseFile.agent_log.push({
      agent: 'Interviewer',
      action: `Error: ${err.message}`,
      timestamp: new Date().toISOString()
    });
    return 'I am sorry, but I am having trouble connecting right now.';
  }
}

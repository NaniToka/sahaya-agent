import Anthropic from '@anthropic-ai/sdk';
import { CaseFile, UserProfile, Confidence } from '../types/caseFile';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runExtractor(caseFile: CaseFile): Promise<void> {
  // If the last message was not from the user, there's nothing new to extract.
  const lastMsg = caseFile.transcript[caseFile.transcript.length - 1];
  if (!lastMsg || lastMsg.speaker !== 'user') return;

  const systemPrompt = `You are a Profile Extractor agent. Your job is to silently read the transcript of an interview between an agent and a user, and extract structured data about the user's profile.
Rules:
1. ONLY record what the user actually said. Never guess or infer.
2. Mark vague answers as "unclear" confidence.
3. If you detect a contradiction with earlier answers, output a flag.
4. You MUST call the update_profile tool.`;

  // Convert transcript to Anthropic message format
  const messages: Anthropic.MessageParam[] = caseFile.transcript.map(msg => ({
    role: msg.speaker === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
      tools: [
        {
          name: 'update_profile',
          description: 'Updates the user profile fields based on new information in the transcript.',
          input_schema: {
            type: 'object',
            properties: {
              updates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                      enum: [
                        'citizenship', 'disability_percentage', 'medical_severity_confirmed',
                        'state_of_residence', 'age', 'has_bpl_card', 'receiving_other_pension',
                        'monthly_income', 'years_since_last_adip_assistance', 'device_deemed_essential',
                        'annual_family_income', 'satisfactory_academic_progress'
                      ]
                    },
                    value: { type: 'string' },
                    confidence: { type: 'string', enum: ['confirmed', 'unclear'] },
                    source_message: { type: 'string' }
                  },
                  required: ['field', 'value', 'confidence', 'source_message']
                }
              },
              consent_given: {
                type: 'boolean',
                description: 'Set to true if the user explicitly consented to collect their details.'
              },
              flags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Any contradictions or issues found.'
              }
            },
            required: ['updates']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'update_profile' }
    });

    const toolCall = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
    
    if (toolCall && toolCall.name === 'update_profile') {
      const args = toolCall.input as any;
      let updatedCount = 0;
      
      if (args.updates) {
        for (const update of args.updates) {
          const field = update.field as keyof UserProfile;
          // Only update if not already confirmed or if this is a correction/contradiction
          caseFile.user_profile[field] = {
            value: update.value,
            confidence: update.confidence as Confidence,
            source_message: update.source_message
          };
          updatedCount++;
        }
      }

      if (args.consent_given === true) {
        caseFile.consent_given = true;
      }

      if (args.flags && args.flags.length > 0) {
        caseFile.flags.push(...args.flags);
      }

      caseFile.agent_log.push({
        agent: 'Extractor',
        action: `Extracted ${updatedCount} fields. Added ${args.flags?.length || 0} flags.`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.error('Extractor error:', err);
    caseFile.agent_log.push({
      agent: 'Extractor',
      action: `Error: ${err.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

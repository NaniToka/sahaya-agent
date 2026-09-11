import { NextResponse } from 'next/server';
import { getCaseFile, saveCaseFile } from '@/db/db';
import { CaseFile } from '@/types/caseFile';
import { runCoordinator } from '@/agents/coordinator';

export async function POST(req: Request) {
  try {
    const { caseId, text, language } = await req.json();

    if (!caseId || !text) {
      return NextResponse.json({ error: 'caseId and text are required' }, { status: 400 });
    }

    // 1. Fetch or initialize case file
    let caseFile = getCaseFile(caseId);
    if (!caseFile) {
      caseFile = {
        id: caseId,
        language: language || 'en',
        consent_given: false,
        transcript: [],
        user_profile: {},
        flags: [],
        stage: 'interviewing',
        agent_log: []
      };
    }

    // 2. Add user message to transcript
    caseFile.transcript.push({
      speaker: 'user',
      text,
      timestamp: new Date().toISOString()
    });

    // 3. Run coordinator
    const replyText = await runCoordinator(caseFile);

    // 4. Save to DB
    saveCaseFile(caseFile);

    // 5. Return reply, agent logs, and updated transcript
    return NextResponse.json({
      reply: replyText,
      agent_log: caseFile.agent_log,
      stage: caseFile.stage,
      transcript: caseFile.transcript
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

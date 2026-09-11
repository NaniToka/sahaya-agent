import 'dotenv/config';
import { runQAAgent } from '../src/agents/qaAgent';
import { CaseFile } from '../src/types/caseFile';

const questions = [
  // English (Answerable)
  { lang: 'en', q: "What is a UDID card?", expectedFallback: false },
  { lang: 'en', q: "Can I get two schemes together if I apply?", expectedFallback: false },
  { lang: 'en', q: "How much is the scholarship for post-matric students?", expectedFallback: false },
  { lang: 'en', q: "What is the age limit for IGNDPS?", expectedFallback: false },
  // English (Unanswerable)
  { lang: 'en', q: "Does the government provide free internet for disabled students?", expectedFallback: true },
  
  // Malayalam (Answerable)
  { lang: 'ml', q: "എന്താണ് UDID കാർഡ്?", expectedFallback: false },
  { lang: 'ml', q: "അസിസ്റ്റീവ് ഡിവൈസ് ലഭിക്കാൻ എന്റെ വരുമാനം എത്രയായിരിക്കണം?", expectedFallback: false },
  { lang: 'ml', q: "പോസ്റ്റ് മെട്രിക് സ്കോളർഷിപ്പ് ലഭിക്കാൻ എന്ത് രേഖകൾ വേണം?", expectedFallback: false },
  { lang: 'ml', q: "എനിക്ക് ഒരു മാസം എത്ര രൂപ പെൻഷൻ കിട്ടും?", expectedFallback: false },
  // Malayalam (Unanswerable)
  { lang: 'ml', q: "ഭിന്നശേഷിക്കാർക്ക് സൗജന്യ ബസ് പാസ് ലഭിക്കുമോ?", expectedFallback: true },

  // Manglish (Answerable)
  { lang: 'ml', q: "UDID card enthanu?", expectedFallback: false },
  { lang: 'ml', q: "ADIP scheme nte benefit enthanu?", expectedFallback: false },
  { lang: 'ml', q: "Pension kittan ethra percentage disability venam?", expectedFallback: false },
  { lang: 'ml', q: "Scholarship apply cheyyan ulla last date eppazhanu?", expectedFallback: false }, // Assume last date isn't mentioned clearly, might fallback or say "no deadline"
  // Manglish (Unanswerable)
  { lang: 'ml', q: "Enikku oru laptop free aayi kittumo?", expectedFallback: true },
];

async function runTests() {
  console.log("Starting Q&A Agent Tests...\n");
  let passed = 0;

  for (let i = 0; i < questions.length; i++) {
    const { lang, q, expectedFallback } = questions[i];
    
    // Create mock case file
    const caseFile: CaseFile = {
      id: `test_${i}`,
      language: lang as 'en' | 'ml',
      consent_given: true,
      transcript: [{ speaker: 'user', text: q, timestamp: new Date().toISOString() }],
      user_profile: {},
      flags: [],
      stage: 'interviewing',
      agent_log: []
    };

    console.log(`[Test ${i+1}/${questions.length}] Language: ${lang} | Q: "${q}"`);
    const reply = await runQAAgent(caseFile);
    
    const wasFallback = reply.includes("couldn't find this") || reply.includes("സോഷ്യൽ വർക്കറുമായി") || reply.includes("social worker");
    
    const lastMsg = caseFile.transcript[caseFile.transcript.length - 1];
    const sourceCount = lastMsg.sources ? lastMsg.sources.length : 0;
    const firstSource = sourceCount > 0 ? lastMsg.sources![0].sourceDocument : 'None';

    const testPassed = wasFallback === expectedFallback;
    if (testPassed) passed++;

    console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Answer: "${reply.slice(0, 80)}..."`);
    console.log(`  Sources used: ${sourceCount} (Top: ${firstSource})`);
    console.log(`  Expected Fallback: ${expectedFallback} | Got Fallback: ${wasFallback}\n`);
  }

  console.log(`\n=== TEST COMPLETE ===`);
  console.log(`Passed: ${passed}/${questions.length}`);
}

runTests().catch(console.error);

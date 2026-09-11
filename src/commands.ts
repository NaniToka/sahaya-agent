export type CommandAction = 
  | 'REPEAT'
  | 'STOP'
  | 'SLOWER'
  | 'FASTER'
  | 'NEXT'
  | 'BACK'
  | 'HELP'
  | 'SOURCES'
  | 'WHERE_AM_I'
  | 'ESCALATE'
  | 'YES'
  | 'NO'
  | 'SKIP'
  | 'CHANGE_MODE';

export const voiceCommands: Record<string, CommandAction> = {
  // English Commands
  'repeat': 'REPEAT',
  'stop': 'STOP',
  'slower': 'SLOWER',
  'faster': 'FASTER',
  'next': 'NEXT',
  'go back': 'BACK',
  'back': 'BACK',
  'help': 'HELP',
  'read sources': 'SOURCES',
  'where am i': 'WHERE_AM_I',
  'talk to a person': 'ESCALATE',
  'yes': 'YES',
  'no': 'NO',
  'skip': 'SKIP',
  'change mode': 'CHANGE_MODE',

  // Malayalam Commands
  'വീണ്ടും': 'REPEAT',
  'veendum': 'REPEAT',
  'നിർത്തുക': 'STOP',
  'nirthuka': 'STOP',
  'പതുക്കെ': 'SLOWER',
  'pathukke': 'SLOWER',
  'വേഗത്തിൽ': 'FASTER',
  'vegathil': 'FASTER',
  'അടുത്തത്': 'NEXT',
  'aduthathu': 'NEXT',
  'പുറകോട്ട്': 'BACK',
  'purakottu': 'BACK',
  'സഹായം': 'HELP',
  'sahayam': 'HELP',
  'ഉറവിടം': 'SOURCES',
  'uravidam': 'SOURCES',
  'എവിടെയാണ്': 'WHERE_AM_I',
  'evideyanu': 'WHERE_AM_I',
  'മനുഷ്യനോട്': 'ESCALATE',
  'manushyanodu': 'ESCALATE',
  'അതെ': 'YES',
  'athe': 'YES',
  'ഇല്ല': 'NO',
  'illa': 'NO',
  'വേണ്ട': 'NO',
  'venda': 'NO',
};

// Returns the matched command if the text matches exactly or contains the command as a primary intent
export function matchCommand(text: string): CommandAction | null {
  const normalized = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  
  // Exact match first
  if (voiceCommands[normalized]) {
    return voiceCommands[normalized];
  }
  
  // Substring match for short texts
  if (normalized.length < 30) {
    for (const [key, action] of Object.entries(voiceCommands)) {
      if (normalized.includes(key)) {
        return action;
      }
    }
  }
  
  return null;
}

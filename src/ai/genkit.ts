import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

function resolveApiKey(): string {
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
  ];
  for (const key of envCandidates) {
    if (
      key &&
      key !== 'MY_GEMINI_API_KEY' &&
      !key.startsWith('YOUR_') &&
      !key.includes('placeholder') &&
      key.trim().length > 10
    ) {
      return key.trim();
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    if (fs.existsSync('/app/.dev.env.json')) {
      const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
      for (const k of [devEnv.GEMINI_API_KEY, devEnv.GOOGLE_GENAI_API_KEY]) {
        if (k && k !== 'MY_GEMINI_API_KEY' && !k.startsWith('YOUR_') && k.trim().length > 10) {
          return k.trim();
        }
      }
    }
  } catch {
    // Ignore error in environments where filesystem read is restricted
  }

  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
}

const apiKey = resolveApiKey();

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: googleAI.model('gemini-3.8-flash'),
});


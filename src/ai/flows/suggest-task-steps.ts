
'use server';
/**
 * @fileOverview AI Flow for decomposing a complex task into actionable sub-tasks.
 * Multipurpose business context suited for a SaaS environment.
 */

import { ai, hasValidGeminiKey } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestStepsInputSchema = z.object({
  taskTitle: z.string().describe('The main title of the task to be decomposed.'),
  businessType: z.string().optional().default('General Business').describe('Type of business for context.'),
});

export type SuggestStepsInput = z.infer<typeof SuggestStepsInputSchema>;

const SuggestStepsOutputSchema = z.object({
  steps: z.array(z.object({
    text: z.string().describe('The actionable step description.'),
  })).describe('A list of suggested sub-tasks.'),
});

export type SuggestStepsOutput = z.infer<typeof SuggestStepsOutputSchema>;

function generateStepsFallback(input: SuggestStepsInput): SuggestStepsOutput {
  const title = input.taskTitle || "Task";
  return {
    steps: [
      { text: `Review scope, requirements, and background details for "${title}"` },
      { text: `Identify required tools, materials, and allocate responsible team members` },
      { text: `Execute the primary implementation steps and operational workflow` },
      { text: `Conduct quality audit and verify against business specifications` },
      { text: `Complete milestone handover and notify manager/client` }
    ]
  };
}

export async function suggestTaskSteps(input: SuggestStepsInput): Promise<SuggestStepsOutput> {
  try {
    if (!hasValidGeminiKey()) {
      return generateStepsFallback(input);
    }
    const { output } = await stepsPrompt(input);
    if (!output || !Array.isArray(output.steps) || output.steps.length === 0) {
      return generateStepsFallback(input);
    }
    return output;
  } catch (err: any) {
    console.warn("[suggestTaskSteps] Gemini call failed, using SOP fallback:", err?.message || err);
    return generateStepsFallback(input);
  }
}

const stepsPrompt = ai.definePrompt({
  name: 'suggestTaskStepsPrompt',
  input: { schema: SuggestStepsInputSchema },
  output: { schema: SuggestStepsOutputSchema },
  prompt: `You are an elite Operations and Project Management consultant.
    The user wants to perform this task: "{{{taskTitle}}}".
    
    Decompose this task into 5-7 clear, actionable, and logical sub-tasks (steps) to complete this task efficiently.
    Focus on professional standard operating procedures (SOPs), quality control, and best practices relevant to modern business.
    Ensure the steps are universal enough for a SaaS user but specific enough to be helpful.
    
    Use a professional and objective tone.`,
});

const suggestTaskStepsFlow = ai.defineFlow(
  {
    name: 'suggestTaskStepsFlow',
    inputSchema: SuggestStepsInputSchema,
    outputSchema: SuggestStepsOutputSchema,
  },
  async (input) => {
    const { output } = await stepsPrompt(input);
    return output!;
  }
);


'use server';
/**
 * @fileOverview AI Flow for decomposing a complex task into actionable sub-tasks.
 * Multipurpose business context suited for a SaaS environment.
 */

import { ai } from '@/ai/genkit';
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

export async function suggestTaskSteps(input: SuggestStepsInput): Promise<SuggestStepsOutput> {
  return suggestTaskStepsFlow(input);
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

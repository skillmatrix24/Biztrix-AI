
'use server';
/**
 * @fileOverview AI Project Task Suggestion Flow.
 * Generates a logical checklist of tasks based on a project title and description.
 * General purpose business context.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestTasksInputSchema = z.object({
  title: z.string().describe('The title of the project.'),
  description: z.string().optional().describe('The description of the project.'),
  deepResearch: z.boolean().optional().default(false).describe('Whether to provide detailed, granular tasks.'),
});

export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().describe('Short title of the task.'),
    description: z.string().describe('Brief description of what to do.'),
    section: z.string().describe('The project phase or category this task belongs to (e.g., Planning, Execution, Delivery).'),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
  })).describe('A list of suggested tasks for this project.'),
});

export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

const suggestTasksPrompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: { schema: SuggestTasksInputSchema },
  output: { schema: SuggestTasksOutputSchema },
  prompt: `You are an expert project manager. 
    Based on the project title "{{{title}}}" and the following details: "{{{description}}}", 
    suggest a professional checklist of actionable tasks grouped by logical phases. 
    
    {{#if deepResearch}}
    **MODE: DEEP RESEARCH**
    - Provide 10-15 highly detailed, technical, and granular tasks.
    - Group them into clear phases like "Research & Discovery", "Execution Phase", "Quality Assurance", and "Deployment".
    {{else}}
    **MODE: STANDARD**
    - Provide 5-8 logical and sequential tasks.
    - Group them into basic phases like "Preparation", "Main Work", and "Final Handover".
    {{/if}}

    Ensure tasks are:
    1. Specifically relevant to the title AND description provided.
    2. Practical for a professional business environment.
    3. Formatted clearly with a specific "section" name for each task.
    
    Assign a realistic priority (high/medium/low) to each task.`,
});

export const suggestProjectTasksFlow = ai.defineFlow(
  {
    name: 'suggestProjectTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async (input) => {
    const { output } = await suggestTasksPrompt(input);
    return output!;
  }
);

export async function suggestProjectTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestProjectTasksFlow(input);
}

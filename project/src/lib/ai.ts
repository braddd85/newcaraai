import { GoogleGenerativeAI } from '@google/generative-ai';
import { Task, useTaskStore } from './store';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

import { AI_CONFIG, CHAT_CONFIG } from './constants';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-pro',
  generationConfig: {
    temperature: AI_CONFIG.GENERATION.TEMPERATURE,
    topP: AI_CONFIG.GENERATION.TOP_P,
    topK: AI_CONFIG.GENERATION.TOP_K,
    maxOutputTokens: AI_CONFIG.GENERATION.MAX_TOKENS,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
  ],
});

const CARA_CONTEXT = `You are Cara, an AI assistant specializing in automotive repair and insurance claims. 
You are helpful, knowledgeable, and focused on providing practical advice for auto repair situations. 
When a user describes a task or repair need, you should offer to create a task for them.
Keep responses concise and relevant to automotive topics.

When creating tasks, extract the following information if available:
- Title: A clear, concise title for the task
- Description: Detailed information about what needs to be done
- Dealership: Any mentioned dealership name
- Insurance Claim: Any mentioned insurance claim numbers
- Priority: Assess urgency on a scale of 1-10`;

export async function extractTaskFromMessage(message: string): Promise<Partial<Task> | null> {
  const prompt = `Extract task information from this message. If no task is described, return null.
  Message: "${message}"
  
  Respond with ONLY a valid JSON object containing these fields if a task is detected, or null if no task:
  {
    "title": "Brief task title",
    "description": "Detailed description",
    "dealership": "Dealership name if mentioned",
    "insuranceClaim": "Claim number if mentioned",
    "aiPriority": number from 1-10 based on urgency
  }`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    if (!text) {
      throw new Error('Empty response from AI');
    }
    
    // Try to extract JSON from the response if it's wrapped in other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const jsonStr = jsonMatch[0];
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Validate the parsed object has the required structure
      if (parsed && typeof parsed === 'object') {
        if (!parsed.title || !parsed.description) {
          return null;
        }
        return {
          title: String(parsed.title),
          description: String(parsed.description),
          dealership: parsed.dealership ? String(parsed.dealership) : undefined,
          insuranceClaim: parsed.insuranceClaim ? String(parsed.insuranceClaim) : undefined,
          aiPriority: parsed.aiPriority ? Math.min(Math.max(Number(parsed.aiPriority), 1), 10) : 5
        };
      }
      return null;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Failed to parse task data:', error);
    return null;
  }
}

export async function createTaskFromChat(taskData: Partial<Task>, userId: string): Promise<string> {
  // Validate and sanitize task data before saving
  const sanitizedTask = {
    title: taskData.title?.trim() || 'New Task',
    description: taskData.description?.trim() || '',
    dealership: taskData.dealership?.trim() || null,
    insuranceClaim: taskData.insuranceClaim?.trim() || null,
    aiPriority: taskData.aiPriority ? Math.min(Math.max(Number(taskData.aiPriority), 1), 10) : 5,
    status: 'pending' as const,
    assignedTo: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: Date.now(), // Use timestamp for initial order
  };

  const newTask = {
    ...sanitizedTask,
  };

  const docRef = await addDoc(collection(db, 'tasks'), newTask);
  return docRef.id;
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= AI_CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      const result = await operation();
      // Validate the response has content
      if (result && typeof result === 'object' && 'text' in result) {
        const text = (result as { text: () => string }).text();
        if (!text.trim()) {
          throw new Error('Empty response from AI');
        }
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`AI request attempt ${attempt} failed:`, lastError.message);
      if (attempt < AI_CONFIG.RETRY.MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, AI_CONFIG.RETRY.DELAY_MS));
      } else {
        throw new Error(`AI request failed after ${AI_CONFIG.RETRY.MAX_ATTEMPTS} attempts: ${lastError.message}`);
      }
    }
  }
  
  throw lastError || new Error('Operation failed after multiple retries');
}

export async function chatWithCara(message: string, history: { role: 'user' | 'assistant', text: string }[] = []): Promise<string> {
  return withRetry(async () => {
    try {
      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        })),
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      
      if (!text.trim()) {
        throw new Error('Empty response from AI');
      }
      
      return text;
    } catch (error) {
      throw new Error(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

export async function generateCompletionStrategy(task: Task, similarTasks: Task[]): Promise<string> {
  const similarTasksContext = similarTasks
    .filter(t => t.status === 'completed')
    .map(t => `${t.title}: ${t.description}`)
    .join('\n');

  const prompt = `Based on these similar completed tasks:
${similarTasksContext}

Generate a completion strategy for this task:
Title: ${task.title}
Description: ${task.description}
Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}

Provide a specific strategy considering time constraints and past successful approaches.`;

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (!response.text()) {
      throw new Error('Empty response from AI');
    }
    return response.text();
  });
}

export async function generateNextAction(task: Partial<Task>): Promise<string> {
  const prompt = `Given this task in an auto repair context:
Title: ${task.title}
Description: ${task.description}
${task.dealership ? `Dealership: ${task.dealership}` : ''}
${task.insuranceClaim ? `Insurance Claim: ${task.insuranceClaim}` : ''}

Suggest ONE specific, actionable next step that would help complete this task. Keep it concise (max 100 characters) and practical.`;

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (!response.text()) {
      throw new Error('Empty response from AI');
    }
    return response.text().replace(/^\d+\.\s*/, '').trim();
  });
}

export async function summarizeTask(task: string): Promise<string> {
  const prompt = `As an automotive repair expert, provide a 2-3 sentence summary of this task, focusing on key repair requirements and technical details: ${task}`;
  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (!response.text()) {
      throw new Error('Empty response from AI');
    }
    return response.text();
  });
}

export async function suggestNextSteps(task: string): Promise<string[]> {
  const prompt = `As an automotive repair expert, suggest 3 specific, actionable steps to complete this repair task. Focus on technical procedures and safety requirements: ${task}

Format each step as a clear, concise instruction.`;
  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (!response.text()) {
      throw new Error('Empty response from AI');
    }
    return response.text().split('\n').filter(Boolean);
  });
}

export async function calculateTaskPriority(task: Task): Promise<number> {
  const prompt = `Analyze this automotive repair task and rate its priority from 1-10 based on:
- Safety implications
- Vehicle drivability
- Customer impact
- Insurance claim requirements
- Time sensitivity

Task Title: ${task.title}
Description: ${task.description}
${task.dealership ? `Dealership: ${task.dealership}` : ''}
${task.insuranceClaim ? `Insurance Claim: ${task.insuranceClaim}` : ''}

Respond with ONLY a number between 1-10.`;

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (!response.text()) {
      throw new Error('Empty response from AI');
    }
    const priority = parseInt(response.text().trim());
    return isNaN(priority) ? 5 : Math.min(Math.max(priority, 1), 10);
  });
}
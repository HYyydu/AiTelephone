// AI Brain - LLM conversation management
import OpenAI from 'openai';
import { config } from '../config';
import { Call } from '../types';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIBrain {
  private conversationHistory: ConversationMessage[] = [];
  private call: Call;

  constructor(call: Call) {
    this.call = call;
    this.initializeSystemPrompt();
  }

  private initializeSystemPrompt() {
    const systemPrompt = `You are a professional AI assistant making a phone call on behalf of a company.

CALL PURPOSE: ${this.call.purpose}

${this.call.additional_instructions ? `ADDITIONAL INSTRUCTIONS: ${this.call.additional_instructions}` : ''}

GUIDELINES:
1. Be polite, professional, and empathetic
2. Keep responses concise and conversational (1-3 sentences)
3. Listen carefully to what the customer says
4. Stay focused on the call purpose
5. If the customer is upset, acknowledge their feelings
6. Offer clear solutions and next steps
7. Confirm important information
8. End the call gracefully when the purpose is achieved

IMPORTANT:
- Speak naturally like a human, not like a robot
- Use casual language appropriate for a phone conversation
- Don't be overly formal or robotic
- Be warm and friendly

Start the conversation by introducing yourself and stating the purpose of the call.`;

    this.conversationHistory.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  async getResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Get response from OpenAI with retry logic
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 150,
      }).catch(async (error) => {
        // Retry once on failure
        console.warn('⚠️  OpenAI request failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return openai.chat.completions.create({
          model: config.openai.model,
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 150,
        });
      });

      const assistantMessage = response.choices[0].message.content || 
        "I apologize, I'm having trouble responding right now. Could you please repeat that?";

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      // Return fallback message instead of throwing
      const fallbackMessage = "I apologize, I'm experiencing technical difficulties. Please try again.";
      this.conversationHistory.push({
        role: 'assistant',
        content: fallbackMessage,
      });
      return fallbackMessage;
    }
  }

  async getInitialGreeting(): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 100,
      });

      const greeting = response.choices[0].message.content || '';
      
      this.conversationHistory.push({
        role: 'assistant',
        content: greeting,
      });

      return greeting;
    } catch (error) {
      console.error('❌ Error generating greeting:', error);
      return "Hello! I'm calling to discuss something with you. Is this a good time to talk?";
    }
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  async generateCallSummary(): Promise<string> {
    try {
      const summaryPrompt = `Based on the following conversation, provide a brief summary of what was discussed and the outcome:

${this.conversationHistory
  .filter(m => m.role !== 'system')
  .map(m => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
  .join('\n')}

Provide a concise summary (2-3 sentences) focusing on the key points and outcome.`;

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes phone conversations.' },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.5,
        max_tokens: 150,
      });

      return response.choices[0].message.content || 'Call completed';
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      return 'Call completed';
    }
  }
}


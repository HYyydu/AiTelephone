// AI Brain - LLM conversation management
import OpenAI from "openai";
import { config } from "../config";
import { Call } from "../types";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DTMFAction {
  shouldPress: boolean;
  digit?: string;
  reason?: string;
}

export class AIBrain {
  private conversationHistory: ConversationMessage[] = [];
  private call: Call;
  private hasIntroduced: boolean = false;
  private missingInformationRequests: string[] = [];

  constructor(call: Call) {
    this.call = call;
    this.initializeSystemPrompt();
  }

  private initializeSystemPrompt() {
    // Extract structured data from call purpose and additional instructions
    const purpose = this.call.purpose || "";
    const additionalContext = this.call.additional_instructions || "";

    // Parse tone preference from additional_instructions if available
    const toneMatch = additionalContext.match(/tone[:\s]+(polite|firm)/i);
    const communicationTone = toneMatch ? toneMatch[1].toLowerCase() : "polite";

    // Extract user name if available in purpose or instructions
    const nameMatch = (purpose + " " + additionalContext).match(
      /(?:user|name|customer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    );
    const userName = nameMatch ? nameMatch[1] : "Sarah";

    const systemPrompt = `YOU ARE THE CUSTOMER - CRITICAL ROLE DEFINITION:
You are Holdless, an AI calling agent that phones customer support on behalf of our users. You are acting as the CUSTOMER who needs help/refund.

The HUMAN on the call is the CUSTOMER SERVICE REPRESENTATIVE who will help you.

ROLE CLARIFICATION:
- YOU (AI): CUSTOMER - You request refunds, ask for help, need assistance. You are NOT customer service.
- THE HUMAN: CUSTOMER SERVICE REPRESENTATIVE - They process refunds, look things up, provide help.

NEVER act like customer service:
- NEVER say "I'll process", "I'll look that up", "I can help you", "How can I help you today?"
- NEVER ask "What can I do for you?" or "How may I assist you?"

ALWAYS act like a customer:
- You NEED help, REQUEST things, ASK for assistance
- You REQUEST refunds, you don't process them
- You are the one who wants something (refund, replacement, etc.)

Your job is to handle the full customer service call end-to-end, get a clear resolution, and keep the user safe and informed.

1. What you know before each call

For every task, you are given structured data:

User profile:
- User name: ${userName}
- Phone number: ${this.call.phone_number}
- Communication tone preference: ${communicationTone}
- Preferred language for summaries: English (but all calls are in English)

Task details:
- Purpose/Issue: ${purpose}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

You NEVER have the user's full card number or other unnecessary sensitive data.

2. Your role and goals on the call

Your role is to act as the user's authorized assistant, not as the user themselves.

Your priorities, in order:
1. Achieve the desired outcome stated in the task (refund, reship, appointment, plan change, fee reversal, etc.).
2. Minimize friction and time for the user (short, efficient call; accept callback if it saves time).
3. Protect user privacy and trust (only share data explicitly allowed; never invent or guess sensitive info).
4. Document everything clearly so the user sees what happened and what's next.

3. How to introduce yourself

IMPORTANT: You should introduce yourself ONLY ONCE at the very beginning of the call, when the customer service representative first greets you.

Your introduction should be:
"Hi, my name is Holdless. I'm an AI assistant calling on behalf of ${userName}, who has authorized me to handle this issue with you today."

If recording is enabled and legally required, add:

"This call may be recorded for ${userName}'s records and for quality purposes."

Then state the purpose in one concise sentence using the task data:

"${purpose}"

CRITICAL: After you have introduced yourself once, NEVER repeat your introduction again. Do not say "I'm calling on behalf of..." or "My name is Holdless" again in the conversation. The representative already knows who you are after the first introduction.

4. Verification and privacy rules

Share only the verification data provided in the task (email, ZIP, last-4, DOB, account number, etc.).

If the agent asks for information you do not have (e.g., full card number, full SSN, order number, account details, etc.), you must:

1. NEVER repeat or guess the information you don't have
2. Track what information has been requested in a mental list
3. FIRST TIME ONLY: Apologize and ask what else is needed:
   "I apologize for the inconvenience, but I don't have access to that information at the moment. I'll need to get that from ${userName} and will contact you back once I have it. Is there anything else you'll need when I call back?"
4. SUBSEQUENT TIMES (when they ask for more information you don't have): Do NOT apologize again. Just confirm the list and ask if there's anything else:
   "Okay, let me confirm you need [list all requested information items]. Is there anything else you'll need when I call back?"
5. Continue this pattern until they say "that's all", "that's everything", "nothing else", or similar
6. Record what information was requested so it can be provided in a follow-up call

Example - First request:
Representative: "I need your email address."
AI: "I apologize for the inconvenience, but I don't have access to that information at the moment. I'll need to get that from ${userName} and will contact you back once I have it. Is there anything else you'll need when I call back?"

Example - Second request (they ask for more):
Representative: "I also need your order number."
AI: "Okay, let me confirm you need your email address and your order number. Is there anything else you'll need when I call back?"

Example - Third request (they ask for more):
Representative: "I'll also need your phone number."
AI: "Okay, let me confirm you need your email address, your order number, and your phone number. Is there anything else you'll need when I call back?"

Example - They say that's all:
Representative: "That's all, thank you."
AI: "Perfect. I'll get that information from ${userName} and call you back with everything. Thank you for your patience."

CRITICAL: 
- Only apologize ONCE (the first time they ask for information you don't have)
- After the first apology, just confirm the list and ask if there's anything else
- Do NOT repeat "I don't have that information" after the first time
- Keep building the list until they say "that's all" or similar

If the workflow requires OTP or user confirmation, pause and send a request back to the app (e.g., ask user for OTP) instead of fabricating anything.

5. Tone and interaction style

Always stay calm, polite, and professional.

${
  communicationTone === "firm"
    ? "Since the user selected firm tone, be more concise and assertive, but never rude."
    : "Be polite and professional in all interactions."
}

Avoid small talk; keep the call outcome-focused.

If the agent proposes something weaker than the desired outcome, politely push back once or twice using policy logic if you have it, for example:

"We appreciate that option. However, ${userName} is requesting [desired outcome]. Is it possible to process this directly as a one-time exception?"

If the agent clearly cannot change it further, accept the best realistic outcome and document it.

6. What to do during the call

Throughout the call, you should:

Track the state:
- verified_identity (yes/no)
- located_order/account (yes/no)
- proposed_resolution (text)
- user_approval_needed (yes/no)
- confirmation_received (case number, refund amount, appointment time)

Handle hold/IVR gracefully:
- When automated systems ask you to press buttons (e.g., "press 1 for representative", "press 2 for billing"), the system will automatically detect and press the appropriate button for you.
- If you hear prompts like "press 1 for real person assistance" or "press 1 to speak with a representative", the system will automatically press 1.
- Navigate menus clearly ("returns", "billing", "representative").
- Wait through hold music; do not complain.
- You don't need to verbally respond to IVR prompts asking for button presses - the system handles this automatically.

Ask clarifying questions when needed to complete the goal:
- "To confirm, will the refund be $[amount] back to the original payment method?"
- "Can you share the case number for our records?"

Secure proof:
- Always ask for confirmation details: case number, refund amount, effective date, appointment slot, or email confirmation.

7. When vendors reject third-party assistants

If the agent says they must speak directly with the customer:

First try:
"Understood. ${userName} has authorized me to handle this issue as their assistant. I can provide all verification details and follow your standard process. Is there any flexibility to continue with me on the line?"

If they still refuse:
- Politely accept and update the task that a live user call is required.
- Summarize all the details collected so far (what they checked, what they need from the user) so the user can call with everything prepared.

8. How to close the call

Before ending, summarize the resolution back to the agent:

"Just to confirm, you've processed [resolution details]. The case number is [case_number], and ${userName} will receive a confirmation email at [email]. Is that all correct?"

Once confirmed, thank the agent and end professionally:

"Great, thank you for your help today. Have a nice day."

Then provide a concise internal summary for the app ("Resolution Card"):
- Outcome: what was achieved / not achieved
- Key numbers: refund amount, case number, appointment date/time
- Next steps for user (if any)
- Any partial or alternative resolutions offered

9. Response guidelines

- Keep responses concise (1-3 sentences at a time)
- Wait for THEM to greet you first (they answer the phone)
- Then introduce yourself as Holdless and explain why you're calling
- ALWAYS listen carefully to what the representative actually says
- Respond DIRECTLY to their specific questions, statements, and concerns
- DO NOT give generic information - respond to what was actually said
- If they ask a question, answer that specific question
- If they provide information, acknowledge it and respond accordingly
- If they interrupt you, stop immediately and listen to what they're saying
- Be genuine and professional in all interactions

10. Avoid repetition

- NEVER repeat information you've already stated in the current conversation
- NEVER repeat your introduction after the first time - the representative already knows who you are
- NEVER say "I'm calling on behalf of..." or "My name is Holdless" after the initial introduction
- If you've already provided verification details, don't repeat them unless specifically asked
- If you've already explained the purpose, don't restate it unless the agent asks
- Keep each response fresh and avoid rephrasing the same points
- If you need to reference something said earlier, do so briefly without repeating the full statement
- Focus on moving the conversation forward, not reiterating what's already been discussed`;

    this.conversationHistory.push({
      role: "system",
      content: systemPrompt,
    });
  }

  /**
   * Detects if the message contains an IVR prompt asking for button presses
   * Returns the digit to press if detected, or null if no action needed
   */
  detectDTMFRequest(message: string): DTMFAction {
    // Patterns for detecting IVR prompts asking for button presses
    const dtmfPatterns = [
      // "Press 1 for...", "Press 2 to...", etc.
      /press\s+(\d+)\s+(?:for|to|if)/i,
      // "If you need X, press 1"
      /if\s+(?:you\s+)?(?:need|want|require).*?press\s+(\d+)/i,
      // "To speak with a representative, press 1"
      /(?:to|for).*?(?:speak|talk|connect|reach).*?(?:representative|agent|person|human|operator).*?press\s+(\d+)/i,
      // "Press 1 for real person assistance"
      /press\s+(\d+).*?(?:real|live|human|person|agent|representative|operator)/i,
      // "Select option 1", "Choose 1"
      /(?:select|choose|enter)\s+(?:option\s+)?(\d+)/i,
      // "Dial 1", "Enter 1"
      /(?:dial|enter|key|push)\s+(\d+)/i,
      // "Press star" or "Press pound"
      /press\s+([*#])/i,
    ];

    for (const pattern of dtmfPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const digit = match[1];
        // Validate digit is valid (0-9, *, #)
        if (/^[0-9*#]$/.test(digit)) {
          return {
            shouldPress: true,
            digit: digit,
            reason: `Detected IVR prompt asking to press ${digit}`,
          };
        }
      }
    }

    // Special case: if message mentions "press 1" for human/representative, prioritize that
    const humanRepPattern =
      /(?:press|push|dial|enter)\s+(\d+).*?(?:human|person|representative|agent|operator|real|live)/i;
    const humanMatch = message.match(humanRepPattern);
    if (humanMatch && humanMatch[1] && /^[0-9]$/.test(humanMatch[1])) {
      return {
        shouldPress: true,
        digit: humanMatch[1],
        reason: `Detected prompt to press ${humanMatch[1]} for human representative`,
      };
    }

    return { shouldPress: false };
  }

  async getResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Detect if customer service is asking for information we might not have
      const informationRequestPatterns = [
        /(?:need|require|ask for|looking for|verify|confirm).*?(?:card number|account number|order number|SSN|social security|date of birth|DOB|full name|address|email|phone|reference number|transaction ID|confirmation number)/i,
        /(?:what|can you provide|do you have).*?(?:card|account|order|SSN|social security|date of birth|DOB|name|address|email|phone|reference|transaction|confirmation)/i,
      ];

      const isInformationRequest = informationRequestPatterns.some((pattern) =>
        pattern.test(userMessage)
      );

      // Add reminder about not repeating introduction if we've already introduced
      const messages = [...this.conversationHistory];
      if (this.hasIntroduced) {
        // Add a reminder message to prevent introduction repetition
        messages.push({
          role: "system",
          content:
            'REMINDER: You have already introduced yourself at the beginning of this call. Do NOT repeat your introduction. Do NOT say "I\'m calling on behalf of..." or "My name is Holdless" again. The representative already knows who you are. Just respond naturally to their question or statement.',
        });
      }

      // Always emphasize listening to actual conversation
      messages.push({
        role: "system",
        content: `IMPORTANT: The customer service representative just said: "${userMessage}". You MUST respond directly to what they actually said. Do not provide generic responses or ignore their specific words. Listen carefully and respond to their actual question, statement, or concern.`,
      });

      // Add reminder about handling missing information requests
      if (isInformationRequest) {
        messages.push({
          role: "system",
          content:
            "IMPORTANT: The customer service representative is asking for information. If you do NOT have this information: 1) Do NOT repeat or guess it, 2) Apologize for the inconvenience, 3) Say you will contact them back after getting it from the user, 4) Confirm what additional information they need. Do NOT repeat the information request multiple times.",
        });
      }

      // Get response from OpenAI with retry logic
      const response = await openai.chat.completions
        .create({
          model: config.openai.model,
          messages: messages,
          temperature: config.openai.temperature,
          max_tokens: 150,
          frequency_penalty: config.openai.frequencyPenalty,
          presence_penalty: config.openai.presencePenalty,
        })
        .catch(async (error) => {
          // Retry once on failure
          console.warn("⚠️  OpenAI request failed, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return openai.chat.completions.create({
            model: config.openai.model,
            messages: messages,
            temperature: config.openai.temperature,
            max_tokens: 150,
            frequency_penalty: config.openai.frequencyPenalty,
            presence_penalty: config.openai.presencePenalty,
          });
        });

      const assistantMessage =
        response.choices[0].message.content ||
        "I apologize, I'm having trouble responding right now. Could you please repeat that?";

      // Track missing information requests if detected
      if (isInformationRequest) {
        // Extract what information was requested
        const infoMatch = userMessage.match(
          /(?:need|require|ask for|looking for|verify|confirm|what|can you provide|do you have).*?(?:card number|account number|order number|SSN|social security|date of birth|DOB|full name|address|email|phone|reference number|transaction ID|confirmation number|[\w\s]+number|[\w\s]+ID)/i
        );
        if (infoMatch) {
          const requestedInfo = infoMatch[0]
            .replace(
              /^(?:need|require|ask for|looking for|verify|confirm|what|can you provide|do you have)\s+/i,
              ""
            )
            .trim();
          if (!this.missingInformationRequests.includes(requestedInfo)) {
            this.missingInformationRequests.push(requestedInfo);
            console.log(`📝 Missing information requested: ${requestedInfo}`);
          }
        }
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("❌ Error getting AI response:", error);
      // Return fallback message instead of throwing
      const fallbackMessage =
        "I apologize, I'm experiencing technical difficulties. Please try again.";
      this.conversationHistory.push({
        role: "assistant",
        content: fallbackMessage,
      });
      return fallbackMessage;
    }
  }

  async getInitialGreeting(): Promise<string> {
    try {
      // As a customer calling customer service, we wait for them to greet us first
      // Then we explain our situation
      const promptForGreeting = `The customer service representative has just answered the phone and greeted you. 
This is the FIRST time you are speaking. Introduce yourself ONCE and explain why you're calling.
Keep it short (1-2 sentences). Remember: you will NOT repeat this introduction later in the conversation.`;

      // Add context to conversation
      this.conversationHistory.push({
        role: "user",
        content: "Hello, how can I help you today?", // Simulating CS rep greeting
      });

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          ...this.conversationHistory,
          { role: "system", content: promptForGreeting },
        ],
        temperature: config.openai.temperature,
        max_tokens: 100,
        frequency_penalty: config.openai.frequencyPenalty,
        presence_penalty: config.openai.presencePenalty,
      });

      const greeting = response.choices[0].message.content || "";

      this.conversationHistory.push({
        role: "assistant",
        content: greeting,
      });

      // Mark that introduction has been made
      this.hasIntroduced = true;

      return greeting;
    } catch (error) {
      console.error("❌ Error generating greeting:", error);
      return "Hi, I'm calling because I need to return an item I purchased. Can you help me with that?";
    }
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  getMissingInformationRequests(): string[] {
    return [...this.missingInformationRequests];
  }

  async generateCallSummary(): Promise<string> {
    try {
      const missingInfoText =
        this.missingInformationRequests.length > 0
          ? `\n\nIMPORTANT: The following information was requested by customer service but was not available: ${this.missingInformationRequests.join(
              ", "
            )}. A follow-up call will be needed once this information is obtained from the user.`
          : "";

      const summaryPrompt = `Based on the following conversation, provide a brief summary of what was discussed and the outcome.
      
Context: The AI was acting as a CUSTOMER calling customer service, not as customer service itself.

${this.conversationHistory
  .filter((m) => m.role !== "system")
  .map(
    (m) =>
      `${m.role === "user" ? "Customer Service Rep" : "Customer (AI)"}: ${
        m.content
      }`
  )
  .join("\n")}${missingInfoText}

Provide a concise summary (2-3 sentences) focusing on what the customer wanted and what resolution was provided. If information was missing, mention that a follow-up call is needed.`;

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes phone conversations.",
          },
          { role: "user", content: summaryPrompt },
        ],
        temperature: 0.5,
        max_tokens: 150,
        frequency_penalty: config.openai.frequencyPenalty,
        presence_penalty: config.openai.presencePenalty,
      });

      return response.choices[0].message.content || "Call completed";
    } catch (error) {
      console.error("❌ Error generating summary:", error);
      return "Call completed";
    }
  }
}

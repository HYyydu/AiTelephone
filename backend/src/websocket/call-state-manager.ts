import type {
  CallConversationState,
  HoldEnterReason,
  HoldExitReason,
  PreAnswerAdvanceReason,
} from "../types";

type ConversationStateBeforeHold = Exclude<CallConversationState, "ON_HOLD">;

/**
 * Single source of truth for in-call conversation state: PRE_ANSWER → ACTIVE_CONVERSATION, ON_HOLD, and hold exit restores prior phase.
 */
export class CallStateManager {
  private state: CallConversationState = "PRE_ANSWER";
  /** Set when entering ON_HOLD so exit restores PRE_ANSWER or ACTIVE_CONVERSATION. */
  private stateBeforeHold: ConversationStateBeforeHold | null = null;
  private lastEnterReason: HoldEnterReason | undefined;
  private lastExitReason: HoldExitReason | undefined;
  private lastPreAnswerAdvanceReason: PreAnswerAdvanceReason | undefined;

  getState(): CallConversationState {
    return this.state;
  }

  isOnHold(): boolean {
    return this.state === "ON_HOLD";
  }

  isPreAnswer(): boolean {
    return this.state === "PRE_ANSWER";
  }

  getLastEnterReason(): HoldEnterReason | undefined {
    return this.lastEnterReason;
  }

  getLastExitReason(): HoldExitReason | undefined {
    return this.lastExitReason;
  }

  getLastPreAnswerAdvanceReason(): PreAnswerAdvanceReason | undefined {
    return this.lastPreAnswerAdvanceReason;
  }

  /**
   * PRE_ANSWER → ACTIVE_CONVERSATION (live CSR / conversation phase).
   * @returns true when a transition occurred (caller should emit side effects).
   */
  advanceToActiveConversation(reason: PreAnswerAdvanceReason): boolean {
    if (this.state !== "PRE_ANSWER") {
      return false;
    }
    this.state = "ACTIVE_CONVERSATION";
    this.lastPreAnswerAdvanceReason = reason;
    return true;
  }

  /**
   * PRE_ANSWER or ACTIVE_CONVERSATION → ON_HOLD. Idempotent if already on hold.
   * @returns true when a transition occurred (caller should emit side effects).
   */
  enterHold(reason: HoldEnterReason): boolean {
    if (this.state === "ON_HOLD") {
      return false;
    }
    this.stateBeforeHold =
      this.state === "PRE_ANSWER" || this.state === "ACTIVE_CONVERSATION"
        ? this.state
        : "ACTIVE_CONVERSATION";
    this.state = "ON_HOLD";
    this.lastEnterReason = reason;
    return true;
  }

  /**
   * ON_HOLD → prior phase (PRE_ANSWER or ACTIVE_CONVERSATION).
   * @returns true when a transition occurred (caller should emit side effects).
   */
  exitHold(reason: HoldExitReason): boolean {
    if (this.state !== "ON_HOLD") {
      return false;
    }
    const next = this.stateBeforeHold ?? "ACTIVE_CONVERSATION";
    this.state = next;
    this.stateBeforeHold = null;
    this.lastExitReason = reason;
    return true;
  }

  reset(): void {
    this.state = "PRE_ANSWER";
    this.stateBeforeHold = null;
    this.lastEnterReason = undefined;
    this.lastExitReason = undefined;
    this.lastPreAnswerAdvanceReason = undefined;
  }
}

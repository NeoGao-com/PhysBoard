import type { SPenButtonAction, SPenConfig, WhiteboardTool } from "@/types/whiteboard";

export interface NativeStylusHint {
  isEraserTail: boolean;
  isPrimaryBarrel: boolean;
  isSecondaryBarrel: boolean;
  ts: number;
}

export interface StylusPointerEventLike {
  pointerType: string;
  button: number;
  buttons: number;
  pressure?: number;
}

export type StylusEventPhase = "down" | "move" | "up" | "cancel" | "leave";

export type StylusOverrideReason = "none" | "hardware-eraser" | "primary-barrel" | "secondary-barrel";

export interface StylusSignal {
  isPen: true;
  isEraserTail: boolean;
  isPrimaryBarrel: boolean;
  isSecondaryBarrel: boolean;
  isTipContact: boolean;
  hasAnyModifier: boolean;
}

export interface StylusTransition {
  effectiveTool: WhiteboardTool;
  changed: boolean;
  enteredTemporary: boolean;
  exitedTemporary: boolean;
  nextActiveTool: WhiteboardTool | null;
  overrideReason: StylusOverrideReason;
}

const NATIVE_HINT_STALE_MS = 1200;

/**
 * Reads the latest native Android stylus hint injected by MainActivity
 * when MotionEvent exposes TOOL_TYPE_ERASER or BUTTON_STYLUS_PRIMARY/SECONDARY.
 */
export function readNativeStylusHint(now = Date.now()): NativeStylusHint | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { __physboardNativeStylusState?: Partial<NativeStylusHint> };
  const raw = win.__physboardNativeStylusState;
  if (!raw || typeof raw !== "object") return null;
  const ts = typeof raw.ts === "number" ? raw.ts : 0;
  if (ts > 0 && now - ts > NATIVE_HINT_STALE_MS) return null;
  return {
    isEraserTail: Boolean(raw.isEraserTail),
    isPrimaryBarrel: Boolean(raw.isPrimaryBarrel),
    isSecondaryBarrel: Boolean(raw.isSecondaryBarrel),
    ts,
  };
}

/**
 * Returns true if the pointer tip or hardware eraser tail is touching/pressing the digitizer.
 * Accepts combined bitmasks when barrel buttons (2/4) or tail eraser (32) are active alongside contact.
 */
export function isStylusTipInContact(e: StylusPointerEventLike): boolean {
  if (e.pointerType !== "pen") {
    return (e.buttons & 1) !== 0;
  }
  if ((e.buttons & 1) !== 0 || (e.buttons & 32) !== 0) {
    return true;
  }
  return (e.pressure ?? 0) > 0 && (e.buttons & (2 | 4)) !== 0;
}

/**
 * Cross-platform normalization layer (`StylusInputAdapter`).
 * Filters strictly to `pointerType === "pen"` and normalizes hardware signals from:
 * - Samsung S Pen / Android WebView (`button === 2` or `buttons & 2`, native `TOOL_TYPE_ERASER` / `BUTTON_STYLUS_*`)
 * - Windows Ink / Surface Pen / AES / MPP (`buttons & 2`, `buttons & 32`, `button === 5`)
 * - Wacom / Huion 2-button styluses (`buttons & 4`, `button === 1`)
 */
export function normalizeStylusEvent(
  e: StylusPointerEventLike,
  phase: StylusEventPhase,
  nativeHint: NativeStylusHint | null = readNativeStylusHint()
): StylusSignal | null {
  if (e.pointerType !== "pen") {
    return null;
  }

  const isDownPhase = phase === "down";
  const isTerminalPhase = phase === "cancel" || phase === "leave";

  if (isTerminalPhase) {
    return {
      isPen: true,
      isEraserTail: false,
      isPrimaryBarrel: false,
      isSecondaryBarrel: false,
      isTipContact: false,
      hasAnyModifier: false,
    };
  }

  // On "up", browser `e.button` indicates which button was JUST released, so only rely on remaining `e.buttons` bitmask.
  const useDownButton = isDownPhase;

  const isEraserTail =
    (e.buttons & 32) !== 0 ||
    (useDownButton && e.button === 5) ||
    Boolean(nativeHint?.isEraserTail);

  const isPrimaryBarrel =
    (e.buttons & 2) !== 0 ||
    (useDownButton && e.button === 2) ||
    Boolean(nativeHint?.isPrimaryBarrel);

  const isSecondaryBarrel =
    (e.buttons & 4) !== 0 ||
    (useDownButton && e.button === 1) ||
    Boolean(nativeHint?.isSecondaryBarrel);

  const isTipContact = phase === "up" ? false : isStylusTipInContact(e);

  return {
    isPen: true,
    isEraserTail,
    isPrimaryBarrel,
    isSecondaryBarrel,
    isTipContact,
    hasAnyModifier: isEraserTail || isPrimaryBarrel || isSecondaryBarrel,
  };
}

function mapActionToTool(action: SPenButtonAction): WhiteboardTool | null {
  if (action === "none") return null;
  return action as WhiteboardTool;
}

/**
 * Resolves which override reason and temporary tool should activate from normalized hardware signals.
 * Priority: Hardware Eraser Tail > Primary Barrel > Secondary Barrel.
 */
export function resolveStylusTarget(
  signal: StylusSignal,
  config: SPenConfig
): { tool: WhiteboardTool | null; reason: StylusOverrideReason } {
  if (signal.isEraserTail && config.hardwareEraserEnabled !== false) {
    return { tool: "erase", reason: "hardware-eraser" };
  }
  if (signal.isPrimaryBarrel) {
    const primaryTool = mapActionToTool(config.action);
    if (primaryTool) {
      return { tool: primaryTool, reason: "primary-barrel" };
    }
  }
  if (signal.isSecondaryBarrel) {
    const secondaryTool = mapActionToTool(config.secondaryAction ?? "none");
    if (secondaryTool) {
      return { tool: secondaryTool, reason: "secondary-barrel" };
    }
  }
  return { tool: null, reason: "none" };
}

/**
 * Finite state machine managing temporary tool overrides without corrupting Undo/Redo history
 * or getting stuck when pointerup/pointercancel/leave occurs unexpectedly.
 */
export class StylusToolStateMachine {
  private previousTool: WhiteboardTool | null = null;
  private activeOverrideTool: WhiteboardTool | null = null;
  private activeReason: StylusOverrideReason = "none";
  private pendingReturnAfterAction = false;

  get isOverridden(): boolean {
    return this.activeOverrideTool !== null;
  }

  get currentReason(): StylusOverrideReason {
    return this.activeReason;
  }

  get savedPreviousTool(): WhiteboardTool | null {
    return this.previousTool;
  }

  /**
   * Forces immediate cleanup (e.g. window blur, visibilitychange, or manual toolbar click).
   */
  forceReset(): WhiteboardTool | null {
    const restore = this.activeOverrideTool !== null || this.pendingReturnAfterAction ? this.previousTool : null;
    this.previousTool = null;
    this.activeOverrideTool = null;
    this.activeReason = "none";
    this.pendingReturnAfterAction = false;
    return restore;
  }

  processEvent(
    e: StylusPointerEventLike,
    phase: StylusEventPhase,
    currentActiveTool: WhiteboardTool,
    config: SPenConfig,
    nativeHint?: NativeStylusHint | null
  ): StylusTransition {
    const signal = normalizeStylusEvent(e, phase, nativeHint);
    if (!signal) {
      return {
        effectiveTool: currentActiveTool,
        changed: false,
        enteredTemporary: false,
        exitedTemporary: false,
        nextActiveTool: null,
        overrideReason: "none",
      };
    }

    // Hardware tail eraser always behaves as momentary hold (erase while touching, restore on lift)
    const target = resolveStylusTarget(signal, config);

    if (phase === "cancel" || phase === "leave") {
      if (this.activeOverrideTool !== null || this.pendingReturnAfterAction) {
        const restore = this.previousTool ?? currentActiveTool;
        this.previousTool = null;
        this.activeOverrideTool = null;
        this.activeReason = "none";
        this.pendingReturnAfterAction = false;
        return {
          effectiveTool: restore,
          changed: restore !== currentActiveTool,
          enteredTemporary: false,
          exitedTemporary: true,
          nextActiveTool: restore,
          overrideReason: "none",
        };
      }
      return {
        effectiveTool: currentActiveTool,
        changed: false,
        enteredTemporary: false,
        exitedTemporary: false,
        nextActiveTool: null,
        overrideReason: "none",
      };
    }

    // Momentary Hold mode (or Hardware Eraser Tail override)
    const isHoldMode = config.behavior === "hold" || target.reason === "hardware-eraser" || this.activeReason === "hardware-eraser";

    if (isHoldMode) {
      if (target.tool && (phase === "down" || phase === "move")) {
        if (this.activeOverrideTool === null) {
          this.previousTool = currentActiveTool;
          this.activeOverrideTool = target.tool;
          this.activeReason = target.reason;
          this.pendingReturnAfterAction = false;
          return {
            effectiveTool: target.tool,
            changed: target.tool !== currentActiveTool,
            enteredTemporary: true,
            exitedTemporary: false,
            nextActiveTool: target.tool,
            overrideReason: target.reason,
          };
        }
        // Switching between e.g. primary barrel and hardware eraser mid-gesture
        if (this.activeOverrideTool !== target.tool || this.activeReason !== target.reason) {
          this.activeOverrideTool = target.tool;
          this.activeReason = target.reason;
          return {
            effectiveTool: target.tool,
            changed: target.tool !== currentActiveTool,
            enteredTemporary: false,
            exitedTemporary: false,
            nextActiveTool: target.tool,
            overrideReason: target.reason,
          };
        }
        return {
          effectiveTool: this.activeOverrideTool,
          changed: false,
          enteredTemporary: false,
          exitedTemporary: false,
          nextActiveTool: null,
          overrideReason: this.activeReason,
        };
      }

      // Modifier released (either during move, or upon pointerup) -> restore previousTool immediately
      if (this.activeOverrideTool !== null) {
        const restore = this.previousTool ?? currentActiveTool;
        this.previousTool = null;
        this.activeOverrideTool = null;
        this.activeReason = "none";
        this.pendingReturnAfterAction = false;
        return {
          effectiveTool: restore,
          changed: restore !== currentActiveTool,
          enteredTemporary: false,
          exitedTemporary: true,
          nextActiveTool: restore,
          overrideReason: "none",
        };
      }

      return {
        effectiveTool: currentActiveTool,
        changed: false,
        enteredTemporary: false,
        exitedTemporary: false,
        nextActiveTool: null,
        overrideReason: "none",
      };
    }

    // Toggle mode (barrel press toggles override on/off; returnAfterAction restores on pointerup)
    if (phase === "down" && target.tool) {
      if (currentActiveTool !== target.tool) {
        this.previousTool = currentActiveTool;
        this.activeOverrideTool = target.tool;
        this.activeReason = target.reason;
        this.pendingReturnAfterAction = Boolean(config.returnAfterAction);
        return {
          effectiveTool: target.tool,
          changed: true,
          enteredTemporary: true,
          exitedTemporary: false,
          nextActiveTool: target.tool,
          overrideReason: target.reason,
        };
      }
      if (this.previousTool !== null) {
        const restore = this.previousTool;
        this.previousTool = null;
        this.activeOverrideTool = null;
        this.activeReason = "none";
        this.pendingReturnAfterAction = false;
        return {
          effectiveTool: restore,
          changed: restore !== currentActiveTool,
          enteredTemporary: false,
          exitedTemporary: true,
          nextActiveTool: restore,
          overrideReason: "none",
        };
      }
    }

    if (phase === "up" && this.pendingReturnAfterAction && this.previousTool !== null) {
      const restore = this.previousTool;
      this.previousTool = null;
      this.activeOverrideTool = null;
      this.activeReason = "none";
      this.pendingReturnAfterAction = false;
      return {
        effectiveTool: restore,
        changed: restore !== currentActiveTool,
        enteredTemporary: false,
        exitedTemporary: true,
        nextActiveTool: restore,
        overrideReason: "none",
      };
    }

    return {
      effectiveTool: currentActiveTool,
      changed: false,
      enteredTemporary: false,
      exitedTemporary: false,
      nextActiveTool: null,
      overrideReason: "none",
    };
  }
}

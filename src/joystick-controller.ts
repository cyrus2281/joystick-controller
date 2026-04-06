// Module-level shared state — replaces window globals
const _activeIdentifiers = new Set<number | string>();
const _activeJoysticks: JoystickController[] = [];

/**
 * Options for the joystick
 */
interface JoystickConfig {
  /**
   * Maximum range of the joystick dot (number of pixels).
   */
  maxRange: number;

  /**
   * Number of levels of the joystick (e.g., 10 would return integers between -10 and 10).
   */
  level: number;

  /**
   * Radius of the joystick container (number of pixels).
   */
  radius: number;

  /**
   * Radius of the joystick inner dot (number of pixels).
   */
  joystickRadius: number;

  /**
   * Opacity of the joystick.
   */
  opacity: number;

  /**
   * Class for the joystick container for adding additional styles (outer container).
   */
  containerClass: string;

  /**
   * Class for the joystick controller for adding additional styles (inner container).
   */
  controllerClass: string;

  /**
   * Class for the joystick dot for adding additional styles.
   */
  joystickClass: string;

  /**
   * Left to right adjustment (x position from left).
   */
  leftToRight: boolean;

  /**
   * Bottom to up adjustment (y position from bottom).
   */
  bottomToUp: boolean;

  /**
   * x position of the joystick controller on screen (equal to left/right in CSS).
   */
  x: string;

  /**
   * y position of the joystick controller on screen (equal to bottom/top in CSS).
   */
  y: string;

  /**
   * If true, the joystick will be distorted when the dot is moved to the edge of the joystick.
   */
  distortion: boolean;

  /**
   * Shows the joystick when the user touches/clicks on the screen at the position where it was clicked/touched.
   */
  dynamicPosition: boolean;

  /**
   * If dynamicPosition is true, uses this target to set the event listener on (if not provided, uses document).
   */
  dynamicPositionTarget: HTMLElement | null;

  /**
   * Click button to show the joystick (if not provided, shows on all clicks).
   * Values: ALL, LEFT, MIDDLE, RIGHT, or button numbers (-1 to 4; -1 for all).
   */
  mouseClickButton: string | number;

  /**
   * If true, hides the context menu on right-click.
   */
  hideContextMenu: boolean;
}

/**
 * Joystick onMove Callback
 */
export interface JoystickOnMove {
  /**
   * x position of the joystick relative to the center of it.
   */
  x: number;

  /**
   * y position of the joystick relative to the center of it.
   */
  y: number;

  /**
   * x position scaled and rounded to be a step between -level to level (level comes from options).
   */
  leveledX: number;

  /**
   * y position scaled and rounded to be a step between -level to level (level comes from options).
   */
  leveledY: number;

  /**
   * Angle of the line between the center of the joystick and position of the dot in radians.
   */
  angle: number;

  /**
   * Distance of the dot from the center joystick.
   */
  distance: number;
}

export type JoystickOptions = Partial<JoystickConfig>;

// Mouse click buttons constants
export const MOUSE_CLICK_BUTTONS = {
  ALL: -1,
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
} as const;

type MouseClickButton = keyof typeof MOUSE_CLICK_BUTTONS | number;

const DEFAULT_OPTIONS: JoystickConfig = {
  maxRange: 100,
  level: 10,
  radius: 50,
  joystickRadius: 30,
  opacity: 0.8,
  leftToRight: true,
  bottomToUp: true,
  containerClass: "",
  controllerClass: "",
  joystickClass: "",
  x: "50%",
  y: "50%",
  distortion: false,
  dynamicPosition: false,
  dynamicPositionTarget: null,
  mouseClickButton: -1,
  hideContextMenu: false,
};

const JOYSTICK_GRAB_TRANSITION = "border-radius 0.2s ease-in-out";
const JOYSTICK_RELEASE_TRANSITION = "all 0.2s ease-in-out";

const _preventDefault = (e: Event) => e.preventDefault();

/**
 * A JavaScript library for creating a virtual joystick.
 * @author Cyrus Mobini
 * @version 1.2.0
 * @docs https://github.com/cyrus2281/joystick-controller#readme
 */
export class JoystickController {
  private options: JoystickConfig;

  /**
   * Joystick onMove Callback
   */
  onMove?: (coordinates: JoystickOnMove) => void;

  /** x position of the joystick relative to its center. */
  x: number = 0;
  /** y position of the joystick relative to its center. */
  y: number = 0;
  /** x scaled to -level … +level */
  leveledX: number = 0;
  /** y scaled to -level … +level */
  leveledY: number = 0;
  /** Angle in radians */
  angle: number = 0;
  /** Distance from center */
  distance: number = 0;

  /**
   * Unique identifier for this joystick instance.
   * DOM elements are accessible via:
   *   .joystick-container-{id}
   *   .joystick-controller-{id}
   *   .joystick-{id}
   */
  id: string;

  private style!: HTMLStyleElement;
  private container!: HTMLDivElement;
  private controller!: HTMLDivElement;
  private joystick!: HTMLDivElement;

  private centerX: number = 0;
  private centerY: number = 0;
  private started: boolean = false;
  private activePointerId: number | null = null;
  private mouseButton: MouseClickButton = MOUSE_CLICK_BUTTONS.ALL;

  // RAF batching state
  private rafId: number = 0;
  private pendingX: number = 0;
  private pendingY: number = 0;
  private pendingAngle: number = 0;
  private pendingDistance: number = 0;

  // Bound references stored for addEventListener/removeEventListener symmetry
  private readonly boundOnPointerDown: (e: PointerEvent) => void;
  private readonly boundOnPointerMove: (e: PointerEvent) => void;
  private readonly boundOnPointerUp: (e: PointerEvent) => void;
  private readonly boundOnResize: () => void;
  private readonly boundFlushDOMUpdate: () => void;

  /**
   * Constructor for the joystick controller
   * @param options Joystick options
   * @param onMove Callback function when the joystick moves
   */
  constructor(
    options: JoystickOptions,
    onMove: (coordinates: JoystickOnMove) => void
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onMove = onMove;

    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnResize = this.recenterJoystick.bind(this);
    this.boundFlushDOMUpdate = this.flushDOMUpdate.bind(this);

    this.id = crypto.randomUUID().replace(/-/g, "");

    this.validate();
    this.init();
  }

  /**
   * Validates if there are any conflicting dynamicPosition options among active joysticks.
   */
  private validate() {
    if (
      _activeJoysticks.length > 0 &&
      _activeJoysticks.some(
        (j) =>
          j.options.dynamicPosition &&
          (j.options.dynamicPositionTarget || document) ===
            (this.options.dynamicPositionTarget || document)
      )
    ) {
      console.error(
        "Multiple dynamicPosition joysticks should use different target elements (dynamicPositionTarget) to prevent event collision."
      );
    }
  }

  /**
   * Resolves the mouseClickButton option to a numeric button value.
   */
  private resolveMouseButton(): MouseClickButton {
    const mcb = this.options.mouseClickButton;
    if (
      typeof mcb === "string" &&
      Object.prototype.hasOwnProperty.call(MOUSE_CLICK_BUTTONS, mcb)
    ) {
      return MOUSE_CLICK_BUTTONS[mcb as keyof typeof MOUSE_CLICK_BUTTONS];
    }
    if (typeof mcb === "number" && mcb >= -1 && mcb <= 4) return mcb;
    return MOUSE_CLICK_BUTTONS.ALL;
  }

  /**
   * Initializes the joystick controller.
   */
  private init() {
    _activeJoysticks.push(this);
    this.mouseButton = this.resolveMouseButton();

    this.buildDOM();
    this.addEventListeners();
    this.recenterJoystick();
    this.resetCoordinates();
  }

  /**
   * Builds the DOM elements and injects styles.
   */
  private buildDOM() {
    const { id, options } = this;

    // Container positioning CSS — dynamic mode uses left/top set by JS at activation time
    let containerPositionCSS: string;
    if (options.dynamicPosition) {
      containerPositionCSS = `left: 0; top: 0;`;
    } else {
      const xProp = options.leftToRight ? "left" : "right";
      const yProp = options.bottomToUp ? "bottom" : "top";
      const xTranslate = options.leftToRight ? "-50%" : "50%";
      const yTranslate = options.bottomToUp ? "50%" : "-50%";
      containerPositionCSS = `
        ${xProp}: ${options.x};
        ${yProp}: ${options.y};
        transform: translate(${xTranslate}, ${yTranslate});`;
    }

    this.style = document.createElement("style");
    this.style.setAttribute("id", "style-" + id);
    this.style.innerHTML = `
        .joystick-container-${id} {
            box-sizing: border-box;
            position: fixed;
            outline: none;
            ${containerPositionCSS}
        }

        .joystick-controller-${id} {
            box-sizing: border-box;
            outline: none;
            opacity: ${options.opacity};
            width: ${options.radius * 2}px;
            height: ${options.radius * 2}px;
            border-radius: 50%;
            position: relative;
            outline: 2px solid #4c4c4c77;
            background: radial-gradient(circle,#ebebeb55, #5c5c5c55);
        }

        .joystick-${id} {
            box-sizing: border-box;
            outline: none;
            position: absolute;
            cursor: grab;
            width: ${options.joystickRadius * 2}px;
            height: ${options.joystickRadius * 2}px;
            z-index: 1;
            border-radius: 50%;
            left: 50%;
            bottom: 50%;
            transform: translate(-50%, 50%);
            background: radial-gradient(#000c, #3e3f46aa);
            transition: ${JOYSTICK_GRAB_TRANSITION};
        }
        `;

    this.container = document.createElement("div");
    this.container.setAttribute("id", "joystick-container-" + id);
    this.container.setAttribute(
      "class",
      "joystick-container-" + id + " " + options.containerClass
    );

    this.controller = document.createElement("div");
    this.controller.setAttribute("id", "joystick-controller-" + id);
    this.controller.setAttribute(
      "class",
      "joystick-controller-" + id + " " + options.controllerClass
    );

    this.joystick = document.createElement("div");
    this.joystick.setAttribute("id", "joystick-" + id);
    this.joystick.setAttribute(
      "class",
      "joystick-" + id + " " + options.joystickClass
    );

    this.controller.appendChild(this.joystick);
    this.container.appendChild(this.controller);
    document.head.appendChild(this.style);

    if (!this.options.dynamicPosition) {
      document.body.appendChild(this.container);
    }
  }

  /**
   * Registers the minimal set of persistent event listeners.
   * pointermove/pointerup are attached dynamically on pointerdown and
   * self-remove on pointerup, so they don't appear here.
   */
  private addEventListeners() {
    if (this.options.dynamicPosition) {
      const target = this.options.dynamicPositionTarget || document;
      target.addEventListener(
        "pointerdown",
        this.boundOnPointerDown as EventListenerOrEventListenerObject
      );
      if (this.options.hideContextMenu) {
        target.addEventListener("contextmenu", _preventDefault);
        this.joystick.addEventListener("contextmenu", _preventDefault);
      }
    } else {
      this.joystick.addEventListener("pointerdown", this.boundOnPointerDown);
      if (this.options.hideContextMenu) {
        this.container.addEventListener("contextmenu", _preventDefault);
        this.joystick.addEventListener("contextmenu", _preventDefault);
      }
    }
    window.addEventListener("resize", this.boundOnResize);
  }

  /**
   * Places the joystick container at (clientX, clientY) and appends it to the DOM.
   * Called only in dynamic positioning mode.
   */
  private activateDynamicPosition(clientX: number, clientY: number) {
    this.container.style.left = clientX + "px";
    this.container.style.top = clientY + "px";
    document.body.appendChild(this.container);
    this.recenterJoystick();
  }

  /**
   * Removes the dynamic joystick container from the DOM.
   */
  private deactivateDynamicPosition() {
    this.container.remove();
  }

  /**
   * Handles pointerdown — unified entry point for mouse and touch.
   */
  private onPointerDown(e: PointerEvent) {
    // Dynamic mode: prevent two joysticks from capturing the same pointer
    if (this.options.dynamicPosition) {
      if (this.activePointerId !== null) return;
      if (_activeIdentifiers.has(e.pointerId)) return;
      // Mouse button filter (touch pointers always report button 0)
      if (
        e.pointerType === "mouse" &&
        this.mouseButton !== MOUSE_CLICK_BUTTONS.ALL &&
        e.button !== this.mouseButton
      )
        return;
      _activeIdentifiers.add(e.pointerId);
      this.activePointerId = e.pointerId;
      this.activateDynamicPosition(e.clientX, e.clientY);
    } else {
      // Static mode: mouse button filter
      if (
        e.pointerType === "mouse" &&
        this.mouseButton !== MOUSE_CLICK_BUTTONS.ALL &&
        e.button !== this.mouseButton
      )
        return;
      this.activePointerId = e.pointerId;
    }

    // Capture the pointer so pointermove/pointerup route here even if
    // the pointer leaves the element — replaces window mousemove/mouseup
    this.joystick.setPointerCapture(e.pointerId);
    this.joystick.addEventListener("pointermove", this.boundOnPointerMove, {
      passive: false,
    });
    this.joystick.addEventListener("pointerup", this.boundOnPointerUp);
    this.joystick.addEventListener("pointercancel", this.boundOnPointerUp);

    this.started = true;
    this.joystick.style.transition = JOYSTICK_GRAB_TRANSITION;
    this.joystick.style.cursor = "grabbing";
  }

  /**
   * Handles pointermove — computes state and schedules a DOM update.
   */
  private onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.activePointerId) return;
    e.preventDefault();
    this.updateCoordinates(e.clientX, e.clientY);
  }

  /**
   * Handles pointerup and pointercancel — cleans up and resets.
   */
  private onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.activePointerId) return;
    // Mouse button filter on release
    if (
      e.type === "pointerup" &&
      e.pointerType === "mouse" &&
      this.mouseButton !== MOUSE_CLICK_BUTTONS.ALL &&
      e.button !== this.mouseButton
    )
      return;

    this.joystick.releasePointerCapture(e.pointerId);
    this.joystick.removeEventListener("pointermove", this.boundOnPointerMove);
    this.joystick.removeEventListener("pointerup", this.boundOnPointerUp);
    this.joystick.removeEventListener("pointercancel", this.boundOnPointerUp);

    if (this.options.dynamicPosition) {
      _activeIdentifiers.delete(this.activePointerId);
      this.deactivateDynamicPosition();
    }

    this.activePointerId = null;
    this.started = false;
    this.joystick.style.transition = JOYSTICK_RELEASE_TRANSITION;
    this.joystick.style.cursor = "grab";
    this.resetCoordinates();
  }

  /**
   * Computes all state from raw client coordinates, fires the onMove callback
   * immediately (so game loops get zero-latency data), then schedules a
   * single RAF flush to batch all DOM writes into one compositor frame.
   */
  private updateCoordinates(clientX: number, clientY: number) {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;

    const rawDistance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDistance = Math.min(rawDistance, this.options.maxRange);

    const x = Math.round(Math.cos(angle) * clampedDistance);
    // CSS Y increases downward; joystick Y increases upward → negate
    const y = -Math.round(Math.sin(angle) * clampedDistance);

    this.x = x;
    this.y = y;
    this.angle = Math.round(angle * 10000) / 10000;
    this.distance = Math.round(rawDistance * 10000) / 10000;
    this.leveledX = Math.round((x / this.options.maxRange) * this.options.level);
    this.leveledY = Math.round((y / this.options.maxRange) * this.options.level);

    // Fire callback synchronously — game loops read this on their own RAF tick
    this.onMove?.({
      x,
      y,
      leveledX: this.leveledX,
      leveledY: this.leveledY,
      angle: this.angle,
      distance: this.distance,
    });

    // Store pending visual state and schedule one RAF flush
    this.pendingX = x;
    this.pendingY = y;
    this.pendingAngle = angle;
    this.pendingDistance = rawDistance;
    this.scheduleDOMUpdate();
  }

  /**
   * Resets all state to center, fires the onMove callback, and writes
   * the resting transform directly (not via RAF — we're not in the hot loop).
   */
  private resetCoordinates() {
    this.x = 0;
    this.y = 0;
    this.leveledX = 0;
    this.leveledY = 0;
    this.angle = 0;
    this.distance = 0;
    this.pendingX = 0;
    this.pendingY = 0;
    this.pendingAngle = 0;
    this.pendingDistance = 0;

    // Cancel any queued RAF so it doesn't overwrite the reset
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.joystick.style.transform = "translate(-50%, 50%)";
    if (this.options.distortion) this.applyDistortion(0, 0, 0);

    this.onMove?.({
      x: 0,
      y: 0,
      leveledX: 0,
      leveledY: 0,
      angle: 0,
      distance: 0,
    });
  }

  /**
   * Schedules a single DOM write on the next animation frame.
   * Multiple calls within one frame collapse into one flush.
   */
  private scheduleDOMUpdate() {
    if (this.rafId !== 0) return;
    this.rafId = requestAnimationFrame(this.boundFlushDOMUpdate);
  }

  /**
   * RAF callback — performs all DOM writes in a single compositor frame.
   * Using transform: translate(calc()) keeps updates GPU-composited
   * (no layout recalculation, no paint).
   */
  private flushDOMUpdate() {
    this.rafId = 0;
    const { pendingX: x, pendingY: y } = this;
    this.joystick.style.transform = `translate(calc(-50% + ${x}px), calc(50% - ${y}px))`;
    if (this.options.distortion) {
      this.applyDistortion(x, y, this.pendingDistance);
    }
  }

  /**
   * Applies or removes the distortion visual effect.
   * Composes with the current translate so both are set in one style write.
   */
  private applyDistortion(x: number, y: number, distance: number) {
    const translate = `translate(calc(-50% + ${x}px), calc(50% - ${y}px))`;
    if (distance > this.options.maxRange * 0.7) {
      this.joystick.style.borderRadius = "70% 80% 70% 15%";
      this.joystick.style.transform =
        `${translate} rotate(${this.pendingAngle + Math.PI / 4}rad)`;
    } else {
      this.joystick.style.borderRadius = "50%";
      this.joystick.style.transform = translate;
    }
  }

  /**
   * Recomputes the joystick center after a window resize or dynamic activation.
   */
  private recenterJoystick() {
    const rect = this.controller.getBoundingClientRect();
    this.centerX = rect.left + this.options.radius;
    this.centerY = rect.top + this.options.radius;
  }

  /**
   * Removes the joystick from the DOM and clears all event listeners.
   */
  destroy() {
    // Cancel any pending RAF
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    // Remove persistent listeners (pointermove/pointerup are self-removing)
    if (this.options.dynamicPosition) {
      const target = this.options.dynamicPositionTarget || document;
      target.removeEventListener(
        "pointerdown",
        this.boundOnPointerDown as EventListenerOrEventListenerObject
      );
      if (this.options.hideContextMenu) {
        target.removeEventListener("contextmenu", _preventDefault);
        this.joystick.removeEventListener("contextmenu", _preventDefault);
      }
    } else {
      this.joystick.removeEventListener("pointerdown", this.boundOnPointerDown);
      if (this.options.hideContextMenu) {
        this.container.removeEventListener("contextmenu", _preventDefault);
        this.joystick.removeEventListener("contextmenu", _preventDefault);
      }
    }
    window.removeEventListener("resize", this.boundOnResize);

    // In case destroy() is called mid-drag, clean up captured pointer listeners
    if (this.activePointerId !== null) {
      this.joystick.removeEventListener("pointermove", this.boundOnPointerMove);
      this.joystick.removeEventListener("pointerup", this.boundOnPointerUp);
      this.joystick.removeEventListener("pointercancel", this.boundOnPointerUp);
      if (this.options.dynamicPosition) {
        _activeIdentifiers.delete(this.activePointerId);
      }
    }

    // Remove DOM elements
    this.style.remove();
    this.container.remove();

    // Remove from active joysticks registry
    const idx = _activeJoysticks.indexOf(this);
    if (idx !== -1) _activeJoysticks.splice(idx, 1);
  }
}

export default JoystickController;

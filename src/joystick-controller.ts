// Joystick window identifier
const JOYSTICK_WINDOW_IDENTIFIER = "__joysticks_identifiers__";
// Active joystick window
const JOYSTICK_WINDOW_ACTIVE = "__active_joysticks__";

/**
 * Declaring global window types
 */
declare global {
  interface Window {
    [JOYSTICK_WINDOW_IDENTIFIER]: Set<string | number>;
    [JOYSTICK_WINDOW_ACTIVE]: JoystickController[];
  }
}

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

/**
 * A JavaScript library for creating a virtual joystick.
 * @author Cyrus Mobini
 * @version 1.1.1
 * @docs https://github.com/cyrus2281/joystick-controller#readme
 */
class JoystickController {
  /**
   * Default transition for the joystick
   */
  private JOYSTICK_TRANSITION: string = "border-radius 0.2s ease-in-out";

  /**
   * Default options for the joystick
   */
  private options: JoystickConfig = {
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

  /**
   * Joystick onMove Callback
   * @param coordinates - The joystick coordinates and state.
   */
  onMove?: (coordinates: JoystickOnMove) => void;

  /**
   * x position of the joystick.
   */
  x: number = 0;

  /**
   * y position of the joystick.
   */
  y: number = 0;

  /**
   * x position of the joystick scaled to be between -level and +level.
   */
  leveledX: number = 0;

  /**
   * y position of the joystick scaled to be between -level and +level.
   */
  leveledY: number = 0;

  /**
   * Angle of the joystick in radians.
   */
  angle: number = 0;

  /**
   * Distance of the joystick dot from the center.
   */
  distance: number = 0;

  /**
   * Style for the joystick.
   */
  private style!: HTMLStyleElement;

  /**
   * ID for the joystick.
   * You can access HTML elements using a prefix and this ID.
   * Container: .joystick-container-{id}
   * Controller: .joystick-controller-{id}
   * Joystick: .joystick-{id}
   */
  id!: string;

  /**
   * Container for the joystick.
   */
  private container!: HTMLDivElement;

  /**
   * Controller for the joystick.
   */
  private controller!: HTMLDivElement;

  /**
   * Joystick element.
   */
  private joystick!: HTMLDivElement;

  /**
   * x center of the joystick.
   */
  private centerX!: number;

  /**
   * y center of the joystick.
   */
  private centerY!: number;

  /**
   * Indicates if the joystick movement has started.
   */
  private started: boolean = false;

  /**
   * Identifier for the joystick for dynamic positioning.
   */
  private identifier: number | string | null = null;

  /**
   * Mouse button to listen on.
   */
  private mouseButton: MouseClickButton = -1;

  /**
   * Constructor for the joystick controller
   * @param options Joystick options
   * @param onMove Callback function when the joystick moves
   */
  constructor(
    options: JoystickOptions,
    onMove: (coordinates: JoystickOnMove) => void
  ) {
    this.options = Object.assign(this.options, options);
    this.onMove = onMove;
    this.validate();
    this.init();
  }

  /**
   * Validates if there are any conflicting dynamicPosition options among active joysticks.
   */
  private validate() {
    if (
      window[JOYSTICK_WINDOW_ACTIVE] &&
      window[JOYSTICK_WINDOW_ACTIVE].length > 0 &&
      window[JOYSTICK_WINDOW_ACTIVE].some(
        (j) =>
          j.options.dynamicPosition &&
          (j.options.dynamicPositionTarget || document) ===
            (this.options.dynamicPositionTarget || document)
      )
    ) {
      console.error(
        "Multiple dynamicPosition should be used with different target elements (dynamicPositionTarget) to prevent event collision."
      );
    }
  }

  /**
   * Initializes the joystick controller.
   */
  private init() {
    // Adding identifier array to window
    if (!window[JOYSTICK_WINDOW_IDENTIFIER]) {
      window[JOYSTICK_WINDOW_IDENTIFIER] = new Set();
    }

    // Generate a unique ID for the joystick
    this.id =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Adding to active joysticks
    window[JOYSTICK_WINDOW_ACTIVE] = Object.assign(
      window[JOYSTICK_WINDOW_ACTIVE] || [],
      [this]
    );

    // Styles for the joystick
    this.style = document.createElement("style");
    this.style.setAttribute("id", "style-" + this.id);
    this.style.innerHTML = `
        .joystick-container-${this.id} {
            box-sizing: border-box;
            position: fixed;
            outline: none;
            ${this.options.leftToRight ? "left" : "right"}: ${this.options.x};
            ${this.options.bottomToUp ? "bottom" : "top"}: ${this.options.y};
            transform: translate(${
              this.options.dynamicPosition || this.options.leftToRight
                ? "-50%"
                : "50%"
            }, ${
      this.options.dynamicPosition || !this.options.bottomToUp ? "-50%" : "50%"
    });
        }
    
        .joystick-controller-${this.id} {
            box-sizing: border-box;
            outline: none;
            opacity: ${this.options.opacity};
            width: ${this.options.radius * 2}px;
            height: ${this.options.radius * 2}px;
            border-radius: 50%;
            position: relative;
            outline: 2px solid #4c4c4c77;
            background: radial-gradient(circle,#ebebeb55, #5c5c5c55);
        }
    
        .joystick-${this.id} {
            box-sizing: border-box;
            outline: none;
            position: absolute;
            cursor: grab;
            width: ${this.options.joystickRadius * 2}px;
            height: ${this.options.joystickRadius * 2}px;
            z-index: 1;
            border-radius: 50%;
            left: 50%;
            bottom: 50%;
            transform: translate(-50%, 50%);
            background: radial-gradient(#000c, #3e3f46aa);
            transition: ${this.JOYSTICK_TRANSITION};
        }
        `;

    // Container for the joystick
    this.container = document.createElement("div");
    this.container.setAttribute("id", "joystick-container-" + this.id);
    this.container.setAttribute(
      "class",
      "joystick-container-" + this.id + " " + this.options.containerClass
    );

    // Controller for the joystick
    this.controller = document.createElement("div");
    this.controller.setAttribute("id", "joystick-controller-" + this.id);
    this.controller.setAttribute(
      "class",
      "joystick-controller-" + this.id + " " + this.options.controllerClass
    );

    // Actual joystick element
    this.joystick = document.createElement("div");
    this.joystick.setAttribute("id", "joystick-" + this.id);
    this.joystick.setAttribute(
      "class",
      "joystick-" + this.id + " " + this.options.joystickClass
    );

    // Append the joystick elements to the DOM
    this.controller.appendChild(this.joystick);
    this.container.appendChild(this.controller);
    document.head.appendChild(this.style);
    if (!this.options.dynamicPosition) {
      document.body.appendChild(this.container);
    }

    // Add event listeners for interaction
    this.addEventListeners();

    // Center of the joystick
    this.recenterJoystick();

    // Resting coordinates
    this.resetCoordinates();
  }

  /**
   * Adds necessary event listeners for the joystick.
   */
  private addEventListeners = () => {
    const mcb = this.options.mouseClickButton;
    if (
      (typeof mcb === "string" &&
        Object.keys(MOUSE_CLICK_BUTTONS).includes(mcb)) ||
      (typeof mcb === "number" && mcb < 6 && mcb > -2)
    ) {
      this.mouseButton =
        typeof mcb === "string"
          ? MOUSE_CLICK_BUTTONS[mcb as keyof typeof MOUSE_CLICK_BUTTONS]
          : mcb;
    }
    if (this.options.dynamicPosition) {
      const target = this.options.dynamicPositionTarget || document;
      // mouse events Listeners
      target.addEventListener(
        "mousedown",
        this.dynamicPositioningMouse as EventListenerOrEventListenerObject
      );
      document.addEventListener(
        "mouseup",
        this.removeDynamicPositioning as EventListenerOrEventListenerObject
      );
      // touch events Listeners
      target.addEventListener(
        "touchstart",
        this.dynamicPositioningTouch as EventListenerOrEventListenerObject
      );
      document.addEventListener("touchmove", this.onTouchEvent, {
        passive: false,
      });
      document.addEventListener("touchend", this.removeDynamicPositioning);
      if (this.options.hideContextMenu) {
        target.addEventListener("contextmenu", (e) => e.preventDefault());
        this.joystick.addEventListener("contextmenu", (e) =>
          e.preventDefault()
        );
      }
    } else {
      // touch events Listeners
      this.joystick.addEventListener("touchstart", this.onStartEvent);
      this.joystick.addEventListener("touchmove", this.onTouchEvent);
      this.joystick.addEventListener("touchend", this.onStopEvent);
      // mouse events Listeners
      this.joystick.addEventListener("mousedown", this.onStartEvent);
      if (this.options.hideContextMenu) {
        this.container.addEventListener("contextmenu", (e) =>
          e.preventDefault()
        );
        this.joystick.addEventListener("contextmenu", (e) =>
          e.preventDefault()
        );
      }
    }
    // window resize listener
    window.addEventListener("resize", this.recenterJoystick);
  };

  /**
   * Fetch the coordinates of the joystick container
   * base on user click, and adds it to document
   * @param e MouseEvent
   */
  private dynamicPositioningMouse = (e: MouseEvent) => {
    if (this.identifier !== null) return;
    if (this.mouseButton !== -1 && e.button !== this.mouseButton) return;
    const identifier = e.x + "-" + e.y;
    if (window[JOYSTICK_WINDOW_IDENTIFIER].has(identifier)) return;
    this.identifier = identifier;
    window[JOYSTICK_WINDOW_IDENTIFIER].add(this.identifier);
    const x = e.clientX;
    const y = e.clientY;
    this.container.style.left = x + "px";
    this.container.style.top = y + "px";
    this.container.style.bottom = "unset";
    this.container.style.right = "unset";
    document.body.appendChild(this.container);
    this.recenterJoystick();
    this.onStartEvent(e, false);
  };

  /**
   * Fetch the coordinates of the joystick container
   * base on user touch, and adds it to document
   * @param event touchstart event
   */
  private dynamicPositioningTouch = (event: TouchEvent) => {
    if (this.identifier !== null) return;
    const identifier = event.changedTouches[0].identifier;
    if (window[JOYSTICK_WINDOW_IDENTIFIER].has(identifier)) return;
    this.identifier = identifier;
    window[JOYSTICK_WINDOW_IDENTIFIER].add(identifier);
    // Current touch (for multi-touch)
    let touch;
    for (let i = 0; i < event.touches.length; i++) {
      const tc = event.touches.item(i);
      if (this.identifier === tc?.identifier) {
        touch = tc;
        break;
      }
    }
    if (!touch) return;
    const x = touch.clientX;
    const y = touch.clientY;
    this.container.style.left = x + "px";
    this.container.style.top = y + "px";
    this.container.style.bottom = "unset";
    this.container.style.right = "unset";
    document.body.appendChild(this.container);
    this.recenterJoystick();
    this.onStartEvent(event, false);
  };

  /**
   * Stop the dynamic positioning of the joystick
   * @param  e mousedown/touchend event
   */
  private removeDynamicPositioning = (e: MouseEvent | TouchEvent) => {
    if (this.identifier === null) return;
    if (e.type === "touchend") {
      const identifier = (e as TouchEvent).changedTouches[0].identifier;
      if (this.identifier !== identifier) return;
    } else if (
      this.mouseButton !== -1 &&
      (e as MouseEvent).button !== this.mouseButton
    )
      return;
    window[JOYSTICK_WINDOW_IDENTIFIER].delete(this.identifier);
    this.identifier = null;
    this.onStopEvent(e);
    this.container.remove();
  };

  /**
   * Updating the x,y, distance,angle, and joystick position base on the x and y
   * @param x x coordinate
   * @param y y coordinate
   */
  private updateCoordinates = (x: number, y: number) => {
    // distance from center
    this.distance = +Math.sqrt(
      Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
    ).toFixed(4);
    // angle from center in Radians
    this.angle = +Math.atan2(y - this.centerY, x - this.centerX).toFixed(4);
    // considering max range
    const adjustedDistance =
      this.distance > this.options.maxRange
        ? this.options.maxRange
        : this.distance;
    // x offset from center
    this.x = Math.round(Math.cos(this.angle) * adjustedDistance);
    // y offset from center
    this.y = -Math.round(Math.sin(this.angle) * adjustedDistance);
    // Scaling x and y to be between -level and +level
    this.leveledX = Math.round(
      (this.x / this.options.maxRange) * this.options.level
    );
    this.leveledY = Math.round(
      (this.y / this.options.maxRange) * this.options.level
    );
    // setting position of stick
    this.joystick.style.left = this.options.radius + this.x + "px";
    this.joystick.style.bottom = this.options.radius + this.y + "px";
    // distort joystick
    this.options.distortion && this.distortJoystick();
    // Triggering Event
    this.onMove &&
      this.onMove({
        x: this.x,
        y: this.y,
        leveledX: this.leveledX,
        leveledY: this.leveledY,
        distance: this.distance,
        angle: this.angle,
      });
  };

  /**
   * Resting Coordinates
   */
  private resetCoordinates = () => {
    this.x = 0;
    this.y = 0;
    this.leveledX = 0;
    this.leveledY = 0;
    this.angle = 0;
    this.distance = 0;
    // reset position of stick
    this.joystick.style.left = this.options.radius + "px";
    this.joystick.style.bottom = this.options.radius + "px";
    // reset joystick distortion
    this.options.distortion && this.distortJoystick();
    // Triggering Event
    this.onMove &&
      this.onMove({
        x: this.x,
        y: this.y,
        leveledX: this.leveledX,
        leveledY: this.leveledY,
        distance: this.distance,
        angle: this.angle,
      });
  };

  /**
   * Distort joystick based on distance if further than 70% of maxRange
   */
  private distortJoystick = () => {
    if (this.distance > this.options.maxRange * 0.7) {
      // distorting joystick
      this.joystick.style.borderRadius = "70% 80% 70% 15%";
      this.joystick.style.transform = `translate(-50%, 50%) rotate(${
        +this.angle + Math.PI / 4
      }rad)`;
    } else {
      // resting to default
      this.joystick.style.borderRadius = "50%";
      this.joystick.style.transform = `translate(-50%, 50%) rotate(${
        Math.PI / 4
      }rad})`;
    }
  };

  /**
   * on grab joystick event
   * @param event
   */
  private onStartEvent = (
    event: MouseEvent | TouchEvent,
    addIdentifier = true
  ) => {
    if (event.type === "mousedown") {
      if (
        this.mouseButton !== -1 &&
        (event as MouseEvent).button !== this.mouseButton
      )
        return;
      window.addEventListener("mousemove", this.onMouseEvent);
      window.addEventListener("mouseup", this.onStopEvent);
    } else if (addIdentifier) {
      const identifier = (event as TouchEvent).changedTouches[0].identifier;
      this.identifier = identifier;
    }
    this.started = true;
    // style adjustment
    this.joystick.style.transition = this.JOYSTICK_TRANSITION;
    this.joystick.style.cursor = "grabbing";
  };

  /**
   * On leave joystick event
   * @param event leave joystick event
   */
  private onStopEvent = (event: MouseEvent | TouchEvent) => {
    if (event.type === "mouseup") {
      if (
        this.mouseButton !== -1 &&
        (event as MouseEvent).button !== this.mouseButton
      )
        return;
      window.removeEventListener("mousemove", this.onMouseEvent);
      window.removeEventListener("mouseup", this.onStopEvent);
    } else {
      this.identifier = null;
    }
    this.started = false;
    // style adjustment
    this.joystick.style.transition = "all 0.2s ease-in-out";
    this.joystick.style.cursor = "grab";
    // reset values
    this.resetCoordinates();
  };

  /**
   * Update the coordinates of the joystick on touch move
   * @param event touch move event
   */
  private onTouchEvent = (event: TouchEvent) => {
    // Current touch (for multi-touch)
    let touch;
    for (let i = 0; i < event.touches.length; i++) {
      const tc = event.touches.item(i);
      if (this.identifier === tc?.identifier) {
        touch = tc;
        break;
      }
    }
    if (!touch) return;
    event.preventDefault();
    // position of touch
    const x = touch.clientX;
    const y = touch.clientY;
    // update coordinates
    this.updateCoordinates(x, y);
  };

  /**
   * Update the coordinates of the joystick on mouse move
   * @param event mouse move event
   */
  private onMouseEvent = (event: MouseEvent) => {
    if (!this.started) return;
    event.preventDefault();
    // position of mouse
    const x = event.clientX;
    const y = event.clientY;
    // distance from center
    this.updateCoordinates(x, y);
  };

  /**
   * Update the center coordinates of the joystick on window resize
   */
  private recenterJoystick = () => {
    // update the center coordinates
    this.centerX =
      this.controller.getBoundingClientRect().left + this.options.radius;
    this.centerY =
      this.controller.getBoundingClientRect().top + this.options.radius;
  };

  /**
   * To remove the joystick from the DOM and clear all the listeners
   */
  destroy() {
    // removing event listeners
    if (this.options.dynamicPosition) {
      const target = this.options.dynamicPositionTarget || document;
      // mouse events Listeners
      target.removeEventListener(
        "mousedown",
        this.dynamicPositioningMouse as EventListenerOrEventListenerObject
      );
      document.removeEventListener("mouseup", this.removeDynamicPositioning);
      // touch events Listeners
      target.removeEventListener(
        "touchstart",
        this.dynamicPositioningTouch as EventListenerOrEventListenerObject
      );
      document.removeEventListener("touchmove", this.onTouchEvent);
      document.removeEventListener("touchend", this.removeDynamicPositioning);
    } else {
      // touch events Listeners
      this.joystick.removeEventListener("touchstart", this.onStartEvent);
      this.joystick.removeEventListener("touchmove", this.onTouchEvent);
      this.joystick.removeEventListener("touchend", this.onStopEvent);
      // mouse events Listeners
      this.joystick.removeEventListener("mousedown", this.onStartEvent);
    }
    window.removeEventListener("resize", this.recenterJoystick);

    // removing elements
    this.style.remove();
    this.container.remove();

    // removing from active joysticks
    if (Array.isArray(window[JOYSTICK_WINDOW_ACTIVE]))
      window[JOYSTICK_WINDOW_ACTIVE] = window[JOYSTICK_WINDOW_ACTIVE].filter(
        (joystick) => joystick !== this
      );
  }
}

export default JoystickController;

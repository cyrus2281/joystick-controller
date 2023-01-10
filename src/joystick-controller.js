/**
 * Options for the joystick
 * @typedef {Object} JoystickOptions
 * @property {number} maxRange - Maximum range of the joystick dot (number of pixels)
 * @property {number} level - Number of level of the joystick (eg 10 would return integers between -10 and 10)
 * @property {number} radius - Radius of the joystick container (number of pixels)
 * @property {number} joystickRadius - Radius of the joystick inner dot (number of pixels)
 * @property {number} opacity - Opacity of the joystick
 * @property {string} containerClass - Class for the joystick container for adding additional styles (outer container)
 * @property {string} controllerClass - Class for the joystick controller for adding additional styles (inner container)
 * @property {string} joystickClass - Class for the joystick dot for adding additional styles
 * @property {boolean} leftToRight - Left to right adjustment (x position from left)
 * @property {boolean} bottomToUp - Bottom to up adjustment (y position from bottom)
 * @property {string} x - x position of the joystick controller on screen (equal to left/right of css)
 * @property {string} y - y position of the joystick controller on screen (equal to bottom/top of css)
 */

/**
 * Joystick onMove Callback
 * @typedef {Object} JoystickOnMove
 * @property {number} x - x position of the joystick relative to the center of it
 * @property {number} y - y position of the joystick relative to the center of it
 * @property {number} leveledX - x position scaled and rounded to be a step between -level to level (level comes from options)
 * @property {number} leveledY - y position scaled and rounded to be a step between -level to level (level comes from options)
 * @property {number} angle - angle of the line between center of the joystick and position of the dot in radians
 * @property {number} distance - distance of the dot from the center joystick
 */

/** 
 * A JavaScript library for creating a virtual joystick.
 * @author Cyrus Mobini
 * @version 1.0.4
 * @docs https://github.com/cyrus2281/joystick-controller#readme
 */
class JoystickController {
  /**
   * Default options for the joystick
   * @type {JoystickOptions}
   * @private
   */
  options = {
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
  };

  /**
   * Joystick onMove Callback
   * @type {(coordinates: JoystickOnMove) => void}
   */
  onMove;
  /**
   * x position of the joystick
   * @type {number}
   */
  x = 0;
  /**
   * y position of the joystick
   * @type {number}
   */
  y = 0;
  /**
   * x position of the joystick scaled to be between -level and +level
   * @type {number}
   */
  leveledX = 0;
  /**
   * y position of the joystick scaled to be between -level and +level
   * @type {number}
   */
  leveledY = 0;
  /**
   * angle of the joystick in radians
   * @type {number}
   */
  angle = 0;
  /**
   * distance of the joystick from center
   * @type {number}
   */
  distance = 0;
  /**
   * Style for the joystick
   * @private
   * @type {HTMLDivElement}
   */
  style;
  /**
   * ID for the joystick.
   *
   * You can access HTML Elements using a prefix and this ID.
   *
   * Container: .joystick-container-{id}
   *
   * Controller: .joystick-controller-{id}
   *
   * Joystick: .joystick-{id}
   * @type {string}
   */
  id;
  /**
   * Container for the joystick
   * @private
   * @type {HTMLDivElement}
   */
  container;
  /**
   * Controller for the joystick
   * @private
   * @type {HTMLDivElement}
   */
  controller;
  /**
   * Joystick
   * @private
   * @type {HTMLDivElement}
   */
  joystick;
  /**
   * x center of the joystick
   * @private
   * @type {number}
   */
  centerX;
  /**
   * y center of the joystick
   * @private
   * @type {number}
   */
  centerY;
  /**
   * Is the joystick move started
   * @private
   * @type {boolean}
   */
  started;

  /**
   * @param {JoystickOptions} options - Options for the joystick
   * @param {(coordinates: JoystickOnMove) => void} onMove - Joystick onMove Callback
   */
  constructor(options, onMove) {
    this.options = Object.assign(this.options, options);
    this.onMove = onMove;
    this.init();
  }

  /**
   * Setting up the joystick
   * @private
   */
  init() {
    // ID
    this.id =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Styles
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
              this.options.leftToRight ? "-50%" : "50%"
            }, ${this.options.bottomToUp ? "50%" : "-50%"});
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
        }
        `;

    // Container
    this.container = document.createElement("div");
    this.container.setAttribute("id", "joystick-container-" + this.id);
    this.container.setAttribute(
      "class",
      "joystick-container-" + this.id + " " + this.options.containerClass
    );

    // Controller
    this.controller = document.createElement("div");
    this.controller.setAttribute("id", "joystick-controller-" + this.id);
    this.controller.setAttribute(
      "class",
      "joystick-controller-" + this.id + " " + this.options.controllerClass
    );

    // Stick
    this.joystick = document.createElement("div");
    this.joystick.setAttribute("id", "joystick-" + this.id);
    this.joystick.setAttribute(
      "class",
      "joystick-" + this.id + " " + this.options.joystickClass
    );

    // Append to Body
    this.controller.appendChild(this.joystick);
    this.container.appendChild(this.controller);
    document.head.appendChild(this.style);
    document.body.appendChild(this.container);

    // center of joystick
    this.centerX =
      this.controller.getBoundingClientRect().left + this.options.radius;
    this.centerY =
      this.controller.getBoundingClientRect().top + this.options.radius;

    // touch events Listeners
    this.joystick.addEventListener("touchstart", this.onStartEvent);
    this.joystick.addEventListener("touchmove", this.onTouchEvent);
    this.joystick.addEventListener("touchend", this.onStopEvent);
    // mouse events Listeners
    this.joystick.addEventListener("mousedown", this.onStartEvent);
    // window resize listener
    window.addEventListener("resize", this.onWindowResize);
    // Resting Coordinates
    this.resetCoordinates();
  }

  /**
   * Updating the x,y, distance,angle, and joystick position base on the x and y
   * @private
   * @param {number} x x coordinate
   * @param {number} y y coordinate
   */
  updateCoordinates = (x, y) => {
    // distance from center
    this.distance = Math.sqrt(
      Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
    ).toFixed(4);
    // angle from center in Radians
    this.angle = Math.atan2(y - this.centerY, x - this.centerX).toFixed(4);
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
   * @private
   */
  resetCoordinates = () => {
    this.x = 0;
    this.y = 0;
    this.leveledX = 0;
    this.leveledY = 0;
    this.angle = 0;
    this.distance = 0;
    // reset position of stick
    this.joystick.style.left = this.options.radius + "px";
    this.joystick.style.bottom = this.options.radius + "px";
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
   * on grab joystick event
   * @private
   * @param {Event} event
   */
  onStartEvent = (event) => {
    this.started = true;
    if (event.type === "mousedown") {
      window.addEventListener("mousemove", this.onMouseEvent);
      window.addEventListener("mouseup", this.onStopEvent);
    }
    // style adjustment
    this.joystick.style.transition = "none";
    this.joystick.style.cursor = "grabbing";
  };

  /**
   * On leave joystick event
   * @private
   * @param {Event} event leave joystick event
   */
  onStopEvent = (event) => {
    this.started = false;
    if (event.type === "mouseup") {
      window.removeEventListener("mousemove", this.onMouseEvent);
      window.removeEventListener("mouseup", this.onStopEvent);
    }
    // style adjustment
    this.joystick.style.transition = "all 0.2s ease-in-out";
    this.joystick.style.cursor = "grab";
    // reset values
    this.resetCoordinates();
  };

  /**
   * Update the coordinates of the joystick on touch move
   * @private
   * @param {Event} event touch move event
   */
  onTouchEvent = (event) => {
    event.preventDefault();
    // Current touch (for multi-touch)
    let touch;
    if (event.touches.length > 1) {
      for (let i = 0; i < event.touches.length; i++) {
        const tc = event.touches.item(i);
        if (tc.target === this.joystick) {
          touch = tc;
        }
      }
    } else {
      touch = event.touches[0];
    }
    // position of touch
    const x = touch.clientX;
    const y = touch.clientY;
    // update coordinates
    this.updateCoordinates(x, y);
  };

  /**
   * Update the coordinates of the joystick on mouse move
   * @private
   * @param {Event} event mouse move event
   */
  onMouseEvent = (event) => {
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
   * @private
   */
  onWindowResize = () => {
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
    this.joystick.removeEventListener("dragstart", this.onStartEvent);
    this.joystick.removeEventListener("touchstart", this.onStartEvent);
    this.joystick.removeEventListener("dragend", this.onStopEvent);
    this.joystick.removeEventListener("touchend", this.onStopEvent);
    this.joystick.removeEventListener("dragmove", this.onMoveEvent);
    this.joystick.removeEventListener("touchmove", this.onTouchEvent);

    // removing elements
    document.head.removeChild(this.style);
    document.body.removeChild(this.container);
  }
}

export default JoystickController;

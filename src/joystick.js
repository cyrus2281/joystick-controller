/**
 * Options for the joystick
 * @typedef {Object} JoystickOptions
 * @property {number} maxRange - Maximum range of the joystick
 * @property {number} levels - Number of levels of the joystick
 * @property {number} radius - Radius of the joystick container
 * @property {number} joystickRadius - Radius of the joystick inner dot
 * @property {boolean} leftToRight - Left to right adjustment
 * @property {boolean} bottomToUp - Bottom to up adjustment
 * @property {string} x - x position of the joystick
 * @property {string} y - y position of the joystick
 */

/**
 * Joystick onMove Callback
 * @typedef {Object} JoystickOnMove
 * @property {number} x - x position of the joystick
 * @property {number} y - y position of the joystick
 * @property {number} angle - angle of the joystick in radians
 * @property {number} distance - distance of the joystick from center
 */

/** A JavaScript library for creating a virtual joystick. */
class Joystick {
  /**
   * Default options for the joystick
   * @type {JoystickOptions}
   * @private
   */
  options = {
    maxRange: 100,
    levels: 10,
    radius: 50,
    joystickRadius: 30,
    leftToRight: true, // left to right
    bottomToUp: false, // bottom to upf
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
   * ID for the joystick
   * @private
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
        #container-${this.id} {
            box-sizing: border-box;
            position: fixed;
            outline: none;
            ${this.options.leftToRight ? "left" : "right"}: ${this.options.x};
            ${this.options.bottomToUp ? "bottom" : "top"}: ${this.options.y};
            transform: translate(${
              this.options.leftToRight ? "-50%" : "50%"
            }, ${this.options.bottomToUp ? "50%" : "-50%"});
        }
    
        #controller-${this.id} {
            box-sizing: border-box;
            border: 1px solid black;
            outline: none;
            width: ${this.options.radius * 2}px;
            height: ${this.options.radius * 2}px;
            border-radius: 50%;
            background-color: white;
            position: relative;
        }
    
        #stick-${this.id} {
            box-sizing: border-box;
            outline: none;
            position: absolute;
            cursor: grab;
            width: ${this.options.joystickRadius * 2}px;
            height: ${this.options.joystickRadius * 2}px;
            z-index: 1;
            border-radius: 50%;
            background-color: black;
            left: 50%;
            bottom: 50%;
            transform: translate(-50%, 50%);
        }
        `;

    // Container
    this.container = document.createElement("div");
    this.container.setAttribute("id", "container-" + this.id);

    // Controller
    this.controller = document.createElement("div");
    this.controller.setAttribute("id", "controller-" + this.id);

    // Stick
    this.joystick = document.createElement("div");
    this.joystick.setAttribute("id", "stick-" + this.id);
    this.joystick.setAttribute("draggable", "true");

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
    // setting position of stick
    this.joystick.style.left = this.options.radius + this.x + "px";
    this.joystick.style.bottom = this.options.radius + this.y + "px";
    // Triggering Event
    this.onMove &&
      this.onMove({
        x: this.x,
        y: this.y,
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
    this.angle = Math.PI.toFixed(4);
    this.distance = 0;
    // Triggering Event
    this.onMove &&
      this.onMove({
        x: this.x,
        y: this.y,
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
    // reset position of stick
    this.joystick.style.left = this.options.radius + "px";
    this.joystick.style.bottom = this.options.radius + "px";
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
    // position of touch
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
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

export default Joystick;

const x = document.querySelector("#x");
const y = document.querySelector("#y");
const distance = document.querySelector("#distance");
const angle = document.querySelector("#angle");
const joystick = new Joystick({}, (data) => {
  x.innerHTML = data.x;
  y.innerHTML = data.y;
  distance.innerHTML = data.distance;
  angle.innerHTML = data.angle;
});
window.joystick = joystick;

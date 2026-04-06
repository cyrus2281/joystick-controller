# Joystick Controller

[![npm](https://img.shields.io/npm/v/joystick-controller)](https://www.npmjs.com/package/joystick-controller)
[![GitHub](https://img.shields.io/github/package-json/v/cyrus2281/joystick-controller?color=red&label=Github)](https://github.com/cyrus2281/joystick-controller)
[![License](https://img.shields.io/github/license/cyrus2281/joystick-controller)](https://github.com/cyrus2281/joystick-controller/blob/main/LICENSE)
[![buyMeACoffee](https://img.shields.io/badge/BuyMeACoffee-cyrus2281-yellow?logo=buymeacoffee)](https://www.buymeacoffee.com/cyrus2281)

![joystick-controller](https://raw.githubusercontent.com/cyrus2281/joystick-controller/main/example/joystick-controller.gif)

A fully customizable JavaScript virtual joystick controller for both desktop and mobile devices supporting multi instances.
[Live Demo](https://joystick-controller.netlify.app)

## Installation

```bash
npm install joystick-controller
```

## Quick Start

```js
import JoystickController from "joystick-controller";

const joystick = new JoystickController({}, (data) => console.log(data));
```

JoystickController also supports CommonJS and global (CDN) import styles.

**CDN / unpkg**

```html
<script src="https://unpkg.com/joystick-controller/dist/joystick-controller.umd.js"></script>
<script>
  // Unwrap the module namespace to get the class
  const JoystickController = window.JoystickController.default;
  const joystick = new JoystickController({}, (data) => console.log(data));
</script>
```

## Browser Support

Requires the [Pointer Events API](https://caniuse.com/pointer), supported in all modern browsers (Chrome 55+, Firefox 59+, Safari 13+, Edge 12+).

## Options

You can pass a set of options as the first argument to further customize your joystick controller.

| Name                  | Type           | Default    | Description                                                                                                                                        |
| --------------------- | -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxRange              | number         | 100        | Maximum range of the joystick dot (number of pixels)                                                                                               |
| level                 | number         | 10         | Number of levels of the joystick (e.g. 10 returns integers between -10 and 10)                                                                     |
| radius                | number         | 50         | Radius of the joystick container (number of pixels)                                                                                                |
| joystickRadius        | number         | 30         | Radius of the joystick inner dot (number of pixels)                                                                                                |
| opacity               | number         | 0.8        | Opacity of the joystick                                                                                                                            |
| containerClass        | string         | ''         | Class for the joystick container for adding additional styles (outer container)                                                                    |
| controllerClass       | string         | ''         | Class for the joystick controller for adding additional styles (inner container)                                                                   |
| joystickClass         | string         | ''         | Class for the joystick dot for adding additional styles                                                                                            |
| leftToRight           | boolean        | true       | x position from left (ignored if dynamicPosition=true)                                                                                             |
| bottomToUp            | boolean        | true       | y position from bottom (ignored if dynamicPosition=true)                                                                                           |
| x                     | string         | '50%'      | x position on screen — maps to CSS left/right (ignored if dynamicPosition=true)                                                                    |
| y                     | string         | '50%'      | y position on screen — maps to CSS bottom/top (ignored if dynamicPosition=true)                                                                    |
| distortion            | boolean        | false      | If true, the joystick dot distorts visually when pushed to the edge                                                                                |
| dynamicPosition       | boolean        | false      | Shows the joystick at the position where the user clicks/touches                                                                                   |
| dynamicPositionTarget | HTMLElement    | null       | If dynamicPosition is true, listens for events on this element (defaults to document)                                                              |
| mouseClickButton      | string\|number | "ALL" (-1) | Mouse button that activates the joystick (ALL, LEFT, MIDDLE, RIGHT, or a button number from -1 to 4; -1 for all)                                   |
| hideContextMenu       | boolean        | false      | If true, suppresses the context menu on right-click (recommended with dynamicPosition)                                                             |

## Callback Arguments

The callback fires on every move event and once on release (all values reset to 0).

| Name     | Type   | Description                                                                              |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| x        | number | x position of the joystick relative to its center                                        |
| y        | number | y position of the joystick relative to its center                                        |
| leveledX | number | x scaled and rounded to an integer between -level and +level                             |
| leveledY | number | y scaled and rounded to an integer between -level and +level                             |
| angle    | number | angle of the line from the center to the dot, in radians                                 |
| distance | number | distance of the dot from the center                                                      |

## Customized Example

All options are optional. A fully customized instance looks like this:

```js
// Static joystick
const staticJoystick = new JoystickController(
  {
    maxRange: 70,
    level: 10,
    radius: 50,
    joystickRadius: 30,
    opacity: 0.5,
    leftToRight: false,
    bottomToUp: true,
    containerClass: "joystick-container",
    controllerClass: "joystick-controller",
    joystickClass: "joystick",
    distortion: true,
    x: "25%",
    y: "25%",
    mouseClickButton: "ALL",
    hideContextMenu: false,
  },
  ({ x, y, leveledX, leveledY, distance, angle }) =>
    console.log(x, y, leveledX, leveledY, distance, angle)
);

// Dynamic position joystick
const dynamicJoystick = new JoystickController(
  {
    maxRange: 70,
    level: 10,
    radius: 50,
    joystickRadius: 30,
    opacity: 0.5,
    containerClass: "joystick-container",
    controllerClass: "joystick-controller",
    joystickClass: "joystick",
    distortion: true,
    dynamicPosition: true,
    dynamicPositionTarget: document.getElementById("root"),
    mouseClickButton: "ALL",
    hideContextMenu: true,
  },
  ({ x, y, leveledX, leveledY, distance, angle }) =>
    console.log(x, y, leveledX, leveledY, distance, angle)
);
```

## Clean Up

Call `destroy()` to remove all event listeners and the joystick element from the DOM.

```js
joystick.destroy();
```

---

Copyright(c) Cyrus Mobini 2024

License MIT

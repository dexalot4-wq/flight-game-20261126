// input.js — keyboard and mouse. Arrows pitch and roll, W/S throttle,
// A/D rudder, mouse drag steers the same way as the arrows. Keys 1-3 pick
// a mission on the title screen, Enter starts, R restarts, P pauses.
export function createInputState() {
  return {
    keys: new Set(),
    pitch: 0, // -1 (nose down) .. 1 (nose up)
    roll: 0, // -1 (left) .. 1 (right)
    yaw: 0, // -1 (left) .. 1 (right)
    throttleDelta: 0,
    mouseDown: false,
    mouseDX: 0,
    mouseDY: 0,
    pressed: new Set(), // keys pressed since the last frame was consumed
  };
}

const KEYMAP = {
  ArrowUp: 'pitchUp',
  ArrowDown: 'pitchDown',
  ArrowLeft: 'rollLeft',
  ArrowRight: 'rollRight',
  KeyW: 'throttleUp',
  KeyS: 'throttleDown',
  KeyA: 'yawLeft',
  KeyD: 'yawRight',
};

export function attachInputListeners(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
    updateAxes(input);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
    updateAxes(input);
  });
  canvas.addEventListener('mousedown', (event) => {
    input.mouseDown = true;
    input.mouseDX = 0;
    input.mouseDY = 0;
    input.lastMouseX = event.clientX;
    input.lastMouseY = event.clientY;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  window.addEventListener('mousemove', (event) => {
    if (!input.mouseDown) return;
    input.mouseDX = event.clientX - (input.lastMouseX ?? event.clientX);
    input.mouseDY = event.clientY - (input.lastMouseY ?? event.clientY);
    input.lastMouseX = event.clientX;
    input.lastMouseY = event.clientY;
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
    updateAxes(input);
  });
}

function updateAxes(input) {
  const k = input.keys;
  const up = k.has('ArrowUp') ? 1 : 0;
  const down = k.has('ArrowDown') ? 1 : 0;
  const left = k.has('ArrowLeft') ? 1 : 0;
  const right = k.has('ArrowRight') ? 1 : 0;
  input.pitch = up - down;
  input.roll = right - left;
  input.yaw = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  input.throttleDelta = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
}

/** Consume the pressed-keys set once per frame; returns it and clears it. */
export function takePressedKeys(input) {
  const pressed = new Set(input.pressed);
  input.pressed.clear();
  return pressed;
}

/** Merge a mouse drag into the stick axes for this frame, then decay it. */
export function applyMouseSteering(input) {
  if (!input.mouseDown) return;
  input.roll = clampAxis(input.roll + input.mouseDX * 0.02);
  input.pitch = clampAxis(input.pitch - input.mouseDY * 0.02);
  input.mouseDX *= 0.7;
  input.mouseDY *= 0.7;
}

function clampAxis(v) {
  return Math.max(-1, Math.min(1, v));
}

export { KEYMAP };

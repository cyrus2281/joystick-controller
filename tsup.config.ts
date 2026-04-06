import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/joystick-controller.ts'],
  format: ['cjs', 'esm', 'iife'],
  globalName: 'JoystickController',
  dts: true,
  minify: true,
  clean: true,
  sourcemap: true,
  target: 'es2017',
  outDir: 'dist',
  outExtension({ format }) {
    if (format === 'esm') return { js: '.mjs' };
    if (format === 'iife') return { js: '.umd.js' };
    return { js: '.js' };
  },
});

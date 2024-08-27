import nodeResolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const env = process.env.NODE_ENV

const extensions = ['.js', '.ts']

const config = {
  input: 'src/joystick-controller.ts',
  external: Object.keys(pkg.peerDependencies || {}).concat('react-dom'),
  output: {
    format: 'umd',
    name: 'JoystickController',
    globals: {},
  },
  plugins: [
    nodeResolve({
      extensions,
    }),
    typescript(),
    babel({
      include: 'src/**/*',
      exclude: '**/node_modules/**',
      babelHelpers: 'runtime',
      extensions,
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
      preventAssignment: true,
    }),
    commonjs(),
  ],
}

if (env === 'production') {
  config.plugins.push(
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false,
      },
    })
  )
}

export default config
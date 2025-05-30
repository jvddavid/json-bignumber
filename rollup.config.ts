import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import pkg from './package.json' assert { type: 'json' }

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      compact: true
    },
    {
      file: 'dist/index.js',
      format: 'esm',
      compact: true
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json'
    }),
    terser()
  ],
  external: pkg.dependencies ? Object.keys(pkg.dependencies) : []
})

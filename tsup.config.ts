import { defineConfig } from 'tsup'

export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/main.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    sourcemap: false,
    clean: true
})

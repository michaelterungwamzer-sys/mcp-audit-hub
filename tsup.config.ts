import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        cli: 'src/cli-entry.ts',
    },
    format: ['esm'],
    dts: { entry: { index: 'src/index.ts' } },
    clean: true,
    target: 'node20',
    sourcemap: true,
});

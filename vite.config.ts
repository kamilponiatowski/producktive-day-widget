import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        'producktive-day': 'src/main.ts',
        'server': 'src/server/index.ts',
      },
      formats: ['es'],
    },
  },
})
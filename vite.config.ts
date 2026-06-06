import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: () => 'producktive-day.js',
    },
  },
})
// ../public/widgets/producktive-day
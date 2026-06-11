import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/RiskWeb/',
  plugins: [react()],
  resolve: {
    alias: {
      // Available after TASK-006 creates shared types package
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Remplacer 'NOM-DU-REPO' par le nom exact de votre projet sur GitHub
  base: command === 'build' ? '/an-nur/' : '/',
}))

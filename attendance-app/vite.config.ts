import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/attendance-app/', // <-- এই লাইনটি যোগ করুন (আপনার রিপোজিটরির নাম অনুযায়ী)
})
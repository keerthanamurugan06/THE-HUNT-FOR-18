
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const approvedTestOrigin = 'https://bfzlszktufjqlfiyknga.supabase.co'

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    // Read only the URL setting; never load or print secret environment values here.
    const fileEnv = loadEnv(mode, process.cwd(), ['VITE_SUPABASE_URL'])
    const configuredUrl = process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL
    let configuredOrigin = ''
    try {
      configuredOrigin = configuredUrl ? new URL(configuredUrl).origin : ''
    } catch {
      // The guard below reports a safe project-target error without echoing the value.
    }
    if (configuredOrigin !== approvedTestOrigin) {
      throw new Error('Local development is restricted to the approved Supabase test project. Set VITE_SUPABASE_URL to the configured test-project endpoint.')
    }
  }

  return {
    plugins: [react(), tailwindcss()],
  }
})

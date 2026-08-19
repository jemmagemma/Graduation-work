import { defineConfig } from 'drizzle-kit'
import path from 'path'

export default defineConfig({
  schema:    './lib/db/schema.ts',
  out:       './drizzle',
  dialect:   'sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'data', 'app.db'),
  },
})

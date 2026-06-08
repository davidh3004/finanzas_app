import { cache } from 'react'
import { createClient } from './server'

// Deduplicates the Supabase auth network call within a single render tree.
// Layout and every page can call this safely — only one HTTP round-trip is made.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

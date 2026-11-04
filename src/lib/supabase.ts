import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Single shared client for v1 (no auth, single user)
// Will migrate to @supabase/ssr with auth for multi-user
export const supabase = createClient(url, key)

// Default user ID for v1 (seeded in migration)
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'

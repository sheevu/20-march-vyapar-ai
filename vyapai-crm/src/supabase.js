import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkgfazoyyggbskzotulx.supabase.co'
const supabaseAnonKey = 'sb_publishable_1tsmOFSvPFWEy6eodhIvFA_AB9rRYqx'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

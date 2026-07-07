import { createClient } from '@supabase/supabase-js'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Uso: node --env-file=.env.local scripts/create-user.mjs <email> <password>')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (error) {
  console.error('Error creando usuario:', error.message)
  process.exit(1)
}

console.log('Usuario creado:', data.user.id, data.user.email)

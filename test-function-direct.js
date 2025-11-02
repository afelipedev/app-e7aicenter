import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogAuthEvent() {
  try {
    console.log('🧪 Testando função log_auth_event...')
    
    const { data, error } = await supabase.rpc('log_auth_event', {
      p_user_id: null,
      p_event_type: 'login_attempt',
      p_event_data: { test: 'direct_test', timestamp: new Date().toISOString() },
      p_ip_address: null,
      p_user_agent: 'Test User Agent'
    })

    if (error) {
      console.error('❌ Erro ao testar função:', error)
      return false
    }

    console.log('✅ Função executada com sucesso! ID:', data)
    return true
  } catch (error) {
    console.error('💥 Exceção ao testar função:', error)
    return false
  }
}

testLogAuthEvent().then(success => {
  if (success) {
    console.log('🎉 Teste concluído com sucesso!')
  } else {
    console.log('💥 Teste falhou.')
  }
  process.exit(success ? 0 : 1)
})
// Teste temporário para verificar se a função log_auth_event está funcionando
import { supabase } from './lib/supabase';

export async function testLogAuthEvent() {
  console.log('🧪 Testando função log_auth_event...');
  
  try {
    const { data, error } = await supabase
      .rpc('log_auth_event', {
        p_user_id: null,
        p_event_type: 'TEST_FUNCTION_WORKING',
        p_event_data: { 
          test: 'function_test', 
          timestamp: new Date().toISOString(),
          message: 'Teste para verificar se PGRST202 foi resolvido'
        },
        p_ip_address: null,
        p_user_agent: 'Test User Agent'
      });

    if (error) {
      console.error('❌ Erro ao testar função log_auth_event:', error);
      return false;
    }

    console.log('✅ Função log_auth_event executada com sucesso! ID:', data);
    return true;
  } catch (error) {
    console.error('❌ Falha ao testar função log_auth_event:', error);
    return false;
  }
}

// Executar teste automaticamente quando importado
testLogAuthEvent().then(success => {
  if (success) {
    console.log('🎉 Teste concluído com sucesso! O erro PGRST202 foi resolvido.');
  } else {
    console.log('💥 Teste falhou. O erro PGRST202 ainda persiste.');
  }
});
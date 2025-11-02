// Teste do logout melhorado
// Este script simula o teste do logout no console do navegador

console.log('🧪 Testando logout melhorado...');

// Simular o clique no botão de logout
// Você pode executar este código no console do navegador para testar
const testLogout = () => {
  // Encontrar o botão de logout
  const logoutButton = document.querySelector('[data-testid="logout-button"]') || 
                      document.querySelector('button:contains("Sair")') ||
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Sair') || btn.textContent.includes('Logout')
                      );
  
  if (logoutButton) {
    console.log('✅ Botão de logout encontrado, clicando...');
    logoutButton.click();
  } else {
    console.log('❌ Botão de logout não encontrado');
    console.log('Botões disponíveis:', Array.from(document.querySelectorAll('button')).map(btn => btn.textContent));
  }
};

// Executar teste
testLogout();
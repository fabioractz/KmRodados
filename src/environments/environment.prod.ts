// Ambiente de PRODUÇÃO
// --------------------
// Este arquivo é usado automaticamente quando você gera build de produção,
// por exemplo: `ng build --configuration production`.
//
// Aqui é onde você controla se os anúncios vão rodar em produção e
// se eles estarão em modo de TESTE ou PRODUÇÃO.
//
// IMPORTANTE:
// - Deixe `enabled: true` para exibir anúncios na versão que vai para as lojas.
// - Deixe `testMode: false` para usar anúncios de PRODUÇÃO (IDs reais).
// - Se quiser testar a versão de produção com anúncios de teste, você pode
//   temporariamente colocar `testMode: true`, mas NÃO envie assim para a loja.

export const environment = {
  production: true,
  ads: {
    // Se estiver "false", nenhum anúncio será carregado na versão de produção
    enabled: true,
    // Em produção, deixe "false" para usar anúncios reais do AdMob.
    // Só use "true" temporariamente para validar comportamento com anúncios de teste.
    testMode: false
  }
};

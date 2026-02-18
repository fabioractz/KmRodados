// Ambiente de DESENVOLVIMENTO
// ---------------------------
// Este arquivo é usado quando você roda o app em modo de desenvolvimento
// (por exemplo: `ionic serve`, `ng serve` ou build sem configuração "production").
//
// Aqui deixamos os anúncios HABILITADOS, porém sempre em MODO DE TESTE.
// Isso garante que, durante o desenvolvimento, NENHUM clique/impresso real
// será contabilizado na sua conta do AdMob.
//
// Quando você gerar build de produção para enviar para a loja,
// o Angular vai substituir este arquivo por `environment.prod.ts`.
// A configuração específica de produção fica lá.
//
export const environment = {
  production: false,
  ads: {
    enabled: true,
    // Se estiver "false", nenhum anúncio será carregado em desenvolvimento
    testMode: true
    // Deve permanecer "true" em desenvolvimento para usar IDs de teste do AdMob
    // e o modo de teste do plugin. Assim você vê anúncios de teste.
  }
};


/*
 * Para debug em desenvolvimento, você pode importar o arquivo abaixo
 * para ignorar algumas informações de pilha de erro relacionadas ao Zone.js,
 * como `zone.run`, `zoneDelegate.invokeTask`.
 *
 * NÃO use esse import em produção, pois pode impactar negativamente a performance
 * se ocorrer um erro.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

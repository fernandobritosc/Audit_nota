// FIX: Removed reference to "vite/client" to resolve type definition error, as the types may not be available in this environment.
// /// <reference types="vite/client" />

declare global {
    // FIX: Resolved duplicate identifier errors by inlining the AIStudio interface.
    // The `AIStudio` type might be declared globally by the hosting environment,
    // causing a conflict. This approach directly augments the `Window` interface
    // without creating a potentially conflicting named interface.
    interface Window {
      /**
       * Um objeto fornecido pelo ambiente de hospedagem do AI Studio para gerenciar a seleção de chaves de API.
       * Será 'undefined' ao rodar em um ambiente de desenvolvimento local.
       */
      aistudio?: {
        /**
         * Verifica se o usuário já selecionou uma chave de API paga através da interface da plataforma.
         * @returns Uma promessa que resolve para 'true' se uma chave foi selecionada, 'false' caso contrário.
         */
        hasSelectedApiKey(): Promise<boolean>;
  
        /**
         * Abre a caixa de diálogo nativa da plataforma para o usuário selecionar uma chave de API paga
         * de seus projetos disponíveis no Google Cloud.
         * @returns Uma promessa que é resolvida quando a caixa de diálogo é fechada.
         */
        openSelectKey(): Promise<void>;
      };
    }
}

// Converte este arquivo em um módulo, o que é necessário para que 'declare global' funcione corretamente.
export {};

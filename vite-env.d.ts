
// FIX: Removed reference to 'vite/client' as it was causing a "Cannot find type definition file" error and is not used in the project.
// The necessary global types are defined here and in types.d.ts.

declare global {
    /**
     * Define a estrutura do objeto 'aistudio' que está disponível no escopo da 'window'.
     */
    interface AIStudio {
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
    }
  
    interface Window {
      /**
       * Um objeto fornecido pelo ambiente de hospedagem do AI Studio para gerenciar a seleção de chaves de API.
       * Será 'undefined' ao rodar em um ambiente de desenvolvimento local.
       */
      aistudio?: AIStudio;
    }
}

// FIX: Added 'export {}' to make this file a module.
// This is required for 'declare global' to augment the global scope correctly and fixes the error:
// "Augmentations for the global scope can only be directly nested in external modules or ambient module declarations."
export {};


// Este arquivo é usado para declarar tipos globais que não fazem parte das bibliotecas padrão
// mas são fornecidos pelo ambiente de hospedagem (como a plataforma AI Studio).

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

declare global {
  interface Window {
    /**
     * Um objeto fornecido pelo ambiente de hospedagem do AI Studio para gerenciar a seleção de chaves de API.
     * Será 'undefined' ao rodar em um ambiente de desenvolvimento local.
     */
    aistudio?: AIStudio;
  }
}

// Isso permite que 'process.env' seja acessado no código do frontend,
// que é preenchido pelo Vite durante o processo de build a partir de arquivos .env.
// FIX: Correctly augment Node.js process.env types to avoid declaration conflicts.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
  }
}

// Esta declaração de exportação é necessária para transformar este arquivo em um módulo,
// o que permite que 'declare global' funcione corretamente em um projeto modular.
export {};

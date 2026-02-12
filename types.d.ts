// Este arquivo é usado para declarar tipos globais que não fazem parte das bibliotecas padrão
// mas são fornecidos pelo ambiente de hospedagem (como a plataforma AI Studio).

// Declarações de módulo para pacotes carregados via importmap para satisfazer o TypeScript.
// Isso evita erros de "módulo não encontrado", tratando-os como tipo 'any'.
declare module 'react';
declare module 'react-dom/client';
declare module '@google/genai';

// FIX: Moved AIStudio interface inside declare global to resolve a TypeScript error
// where the type was being declared in a different scope than its usage, causing a conflict.
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

  // Adiciona uma definição mínima para o namespace JSX para resolver erros de tipo em elementos JSX.
  // Isso é necessário porque os tipos completos do React não estão disponíveis no ambiente.
  namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
  }

  interface Window {
    /**
     * Um objeto fornecido pelo ambiente de hospedagem do AI Studio para gerenciar a seleção de chaves de API.
     * Será 'undefined' ao rodar em um ambiente de desenvolvimento local.
     */
    aistudio?: AIStudio;
  }

  // Isso permite que 'process.env' seja acessado no código do frontend,
  // que é preenchido pelo Vite durante o processo de build a partir de arquivos .env.
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
    }
  }
}

// Esta declaração de exportação é necessária para transformar este arquivo em um módulo,
// o que permite que 'declare global' funcione corretamente em um projeto modular.
export {};

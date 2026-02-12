// Este arquivo é usado para declarar tipos globais que não fazem parte das bibliotecas padrão
// mas são fornecidos pelo ambiente de hospedagem (como a plataforma AI Studio).

// Declarações de módulo para pacotes carregados via importmap para satisfazer o TypeScript.
// Isso evita erros de "módulo não encontrado", tratando-os como tipo 'any'.
declare module 'react';
declare module 'react-dom/client';
declare module '@google/genai';

declare global {
  // Adiciona uma definição mínima para o namespace JSX para resolver erros de tipo em elementos JSX.
  // Isso é necessário porque os tipos completos do React não estão disponíveis no ambiente.
  namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
  }

  // Isso permite que 'process.env' seja acessado no código do frontend,
  // que é preenchido pelo Vite durante o processo de build a partir de arquivos .env.
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
    }
  }

  // A definição de AIStudio e Window foi movida para vite-env.d.ts para seguir as convenções do Vite.
}

// Esta declaração de exportação é necessária para transformar este arquivo em um módulo,
// o que permite que 'declare global' funcione corretamente em um projeto modular.
export {};

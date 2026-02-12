/// <reference types="vite/client" />

// FIX: Consolidating all global declarations into one file to fix duplicate identifier errors.
// NOTE: These are basic module declarations for an environment that may not have full node/type resolution (e.g., in-browser IDE).
declare module 'react';
declare module 'react-dom/client';
declare module '@google/genai';

declare global {
  /**
   * Adds a minimal definition for the JSX namespace to resolve type errors in JSX elements.
   * This is necessary because full React types may not be available in the environment.
   */
  namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
  }

  /**
   * Allows 'process.env' to be accessed in frontend code,
   * which is populated by Vite during the build process from .env files.
   */
  namespace NodeJS {
    interface ProcessEnv {
      readonly API_KEY?: string;
    }
  }

  /**
   * Defines the structure of the 'aistudio' object that is available on the 'window' scope in the hosting environment.
   */
  interface AIStudio {
    /**
     * Checks if the user has already selected a paid API key through the platform's UI.
     * @returns A promise that resolves to 'true' if a key has been selected, 'false' otherwise.
     */
    hasSelectedApiKey(): Promise<boolean>;

    /**
     * Opens the platform's native dialog for the user to select a paid API key
     * from their available Google Cloud projects.
     * @returns A promise that resolves when the dialog is closed.
     */
    openSelectKey(): Promise<void>;
  }

  interface Window {
    /**
     * An object provided by the AI Studio hosting environment to manage API key selection.
     * Will be 'undefined' when running in a local development environment.
     */
    aistudio?: AIStudio;
  }
}

// This export statement is necessary to treat this file as a module,
// which allows 'declare global' to work correctly in a modular project.
export {};

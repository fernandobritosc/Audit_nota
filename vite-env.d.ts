// FIX: Removed reference to 'vite/client' to resolve a type definition error in the build environment.
// The app defines its own required types below and does not use client-specific Vite APIs.

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
      // FIX: API_KEY is a hard requirement from environment variables.
      readonly API_KEY: string;
    }
  }
}

// This export statement is necessary to treat this file as a module,
// which allows 'declare global' to work correctly in a modular project.
export {};

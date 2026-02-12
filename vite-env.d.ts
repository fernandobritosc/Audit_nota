// FIX: Removed reference to 'vite/client' as it was causing a "Cannot find type definition file" error and is not used in the project.
// The necessary global types are defined here and in types.d.ts.
// FIX: Moved global type declarations for AIStudio to types.d.ts to resolve duplicate identifier errors.


// FIX: Added 'export {}' to make this file a module.
// This is required for 'declare global' to augment the global scope correctly and fixes the error:
// "Augmentations for the global scope can only be directly nested in external modules or ambient module declarations."
export {};

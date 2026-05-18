/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLITCHTIP_DSN?: string;
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

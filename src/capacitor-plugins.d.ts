declare module '@capacitor/filesystem' {
  export enum Directory {
    Documents = 'DOCUMENTS',
    Data = 'DATA',
    Cache = 'CACHE',
    External = 'EXTERNAL',
    ExternalStorage = 'EXTERNAL_STORAGE'
  }

  export enum Encoding {
    UTF8 = 'utf8'
  }

  export interface OpcaoEscritaArquivo {
    path: string;
    data: string;
    directory?: Directory;
    encoding?: Encoding;
  }

  export interface OpcaoObterUri {
    path: string;
    directory?: Directory;
  }

  export interface ResultadoObterUri {
    uri: string;
  }

  export const Filesystem: {
    writeFile(opcoes: OpcaoEscritaArquivo): Promise<void>;
    getUri(opcoes: OpcaoObterUri): Promise<ResultadoObterUri>;
  };
}

declare module '@capacitor/share' {
  export interface OpcaoCompartilhamento {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }

  export const Share: {
    share(opcoes: OpcaoCompartilhamento): Promise<void>;
  };
}


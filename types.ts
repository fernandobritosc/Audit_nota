
export interface ExtractedData {
    razaoSocial: string;
    cnpj: string;
    numeroNF: string;
    valorBruto: number | string;
    optanteSimples: string; // "SIM" | "NÃO"
    isMei: string; // "SIM" | "NÃO"
    aliquotaIR: number | string;
    aliquotaISS: number | string;
    localServico: string;
    municipioIncidencia: string;
    documentoTipo?: string; // e.g., "PRODUTO", "SERVICO"
    codigoReinf?: string;
    valorINSS?: number | string;
    baseCalculoINSS?: number | string;
    aliquotaINSS?: number | string;
}

export interface CalculatedData {
    razaoSocial: string;
    cnpj: string;
    numeroNF: string;
    valorBruto: number;
    optanteSimples: string;
    isMei: string;
    localServico: string;
    municipioIncidencia: string;
    irrf: {
        rate: number;
        value: number;
        observacao?: string;
    };
    iss: {
        rate: number;
        value: number;
    };
    inss: {
        rate: number;
        base: number;
        value: number;
    };
    issObservacao?: string;
    valorLiquido: number;
    documentoTipo?: string;
    codigoReinf: string;
}

import { type ExtractedData } from '../types';

export interface ProcessedTaxData {
    valorBruto: number;
    irrf: { rate: number; value: number; observacao?: string };
    iss: { rate: number; value: number; };
    inss: { rate: number; base: number; value: number; };
    issObservacao: string;
    valorLiquido: number;
    municipioIncidencia: string;
}

export function processTaxCalculations(extractedData: ExtractedData): ProcessedTaxData {
    const valorBruto = Number(extractedData.valorBruto);
    const aliquotaIR = Number(extractedData.aliquotaIR) || 0;
    const aliquotaISS = Number(extractedData.aliquotaISS) || 0;
    const documentoTipo = extractedData.documentoTipo?.toUpperCase() || 'INDEFINIDO';
    
    // INSS values
    let inssValue = Number(extractedData.valorINSS) || 0;
    const inssBase = Number(extractedData.baseCalculoINSS) || 0;
    const inssRate = Number(extractedData.aliquotaINSS) || 0;

    // Recalculate INSS value if it seems to be missing but we have the components
    if (inssValue === 0 && inssBase > 0 && inssRate > 0) {
        inssValue = parseFloat((inssBase * (inssRate / 100)).toFixed(2));
    }
    
    let finalMunicipioIncidencia = extractedData.municipioIncidencia;

    // --- Lógica de Retenção de IR ---
    let irrfValue = 0;
    let irrfObservacao = '';
    const isSimplesOuMei = 
         extractedData.optanteSimples?.toUpperCase().trim() === 'SIM' || 
         extractedData.isMei?.toUpperCase().trim() === 'SIM';

    if (isSimplesOuMei) {
        irrfValue = 0;
        irrfObservacao = 'IR não retido. Fornecedor é Optante pelo Simples Nacional ou MEI.';
    } else {
        irrfValue = valorBruto * (aliquotaIR / 100);
        if (irrfValue < 10.0) {
            const originalValue = valorBruto * (aliquotaIR / 100);
            irrfValue = 0;
            if (originalValue > 0) {
               irrfObservacao = 'Dispensa de retenção. Valor do IR inferior a R$ 10,00.';
            }
        }
    }


    // --- Lógica de Retenção de ISS ---
    let issValue = 0;
    let issObservacao = '';
    const isSimples = extractedData.optanteSimples?.toUpperCase().trim() === 'SIM';

    if (documentoTipo === 'PRODUTO') {
        issValue = 0;
        issObservacao = 'Operação de venda (DANFE/Produto). Sem retenção de ISS.';
        finalMunicipioIncidencia = 'Senador Canedo';
    } else { // Lógica para serviços
        const municipioIncidenciaNormalizado = (extractedData.municipioIncidencia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isSenadorCanedo = municipioIncidenciaNormalizado.includes('senador canedo');

        if (isSenadorCanedo) {
            issValue = valorBruto * (aliquotaISS / 100);
            if (isSimples) {
                issObservacao = 'ISS retido conforme legislação municipal para Optantes do Simples.';
            } else {
                issObservacao = 'ISS retido normalmente em Senador Canedo.';
            }
        } else {
            issValue = 0; // Explicitly set to 0
            issObservacao = `ISS devido em ${extractedData.municipioIncidencia || 'local não informado'}, não retido na fonte por Senador Canedo.`;
        }
    }

    const valorLiquido = valorBruto - irrfValue - issValue - inssValue;

    return {
        valorBruto,
        irrf: {
            rate: aliquotaIR,
            value: irrfValue,
            observacao: irrfObservacao,
        },
        iss: {
            rate: aliquotaISS,
            value: issValue,
        },
        inss: {
            rate: inssRate,
            base: inssBase,
            value: inssValue,
        },
        issObservacao,
        valorLiquido,
        municipioIncidencia: finalMunicipioIncidencia
    };
}

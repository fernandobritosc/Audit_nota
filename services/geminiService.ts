
import { GoogleGenAI } from "@google/genai";
import { type ExtractedData } from '../types.ts';

// Helper function to convert a base64 data URL to a GenerativePart object
function fileToGenerativePart(dataUrl: string) {
    const parts = dataUrl.split(';base64,');
    if (parts.length !== 2) {
        throw new Error('URL de dados base64 inválida.');
    }
    const mimeType = parts[0].split(':')[1];
    const data = parts[1];
    return {
        inlineData: {
            data,
            mimeType,
        },
    };
}


export async function extractInvoiceData(base64DataUrl: string): Promise<ExtractedData> {
    // FIX: Initialize with process.env.API_KEY per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const promptText = `
        Você é um assistente especialista em automação de contabilidade, analisando documentos fiscais brasileiros. Sua tarefa é extrair informações específicas da imagem fornecida.

        Analise a imagem e extraia os seguintes campos:
        1.  "razaoSocial": O nome completo da empresa (Fornecedor).
        2.  "cnpj": O CNPJ do fornecedor. Formate-o como XX.XXX.XXX/XXXX-XX.
        3.  "numeroNF": O número da nota fiscal.
        4.  "optanteSimples": Verifique se a empresa é optante pelo Simples Nacional. Retorne "SIM" ou "NÃO".
        5.  "isMei": Verifique se a empresa é MEI (Microempreendedor Individual). Retorne "SIM" ou "NÃO".
        6.  "localServico": O local da prestação do serviço.
        7.  "municipioIncidencia": O município onde o imposto (ISS) incide.
        8.  "valorBruto": O valor bruto total do serviço. Extraia como um número, usando ponto como separador decimal (ex: 1234.56).
        9.  "aliquotaIR": A alíquota de I.R. em porcentagem. Retorne apenas o número (ex: para 1,5%, retorne 1.5).
        10. "aliquotaISS": A alíquota de ISS em porcentagem. Retorne apenas o número (ex: para 3,29%, retorne 3.29).
        11. "documentoTipo": Classifique o documento. Se contiver termos como "DANFE", "venda", "produto" ou similar, retorne "PRODUTO". Se for uma nota fiscal de serviço, retorne "SERVICO". Se não for claro, retorne "INDEFINIDO".
        12. "codigoReinf": O código do serviço (natureza do rendimento). Extraia apenas o número de 5 dígitos (ex: 17032). Se não encontrar, retorne "".
        13. "valorINSS": O valor da retenção de INSS. Extraia como um número.
        14. "baseCalculoINSS": A base de cálculo para o INSS. Extraia como um número.
        15. "aliquotaINSS": A alíquota de INSS em porcentagem. Retorne apenas o número.

        Se algum campo não for encontrado, retorne um valor padrão apropriado (string vazia "" ou 0 para números).

        O resultado deve ser um único objeto JSON.
    `;
    
    const imagePart = fileToGenerativePart(base64DataUrl);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: promptText }, imagePart] },
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) {
             throw new Error("A IA não retornou uma resposta válida. O conteúdo pode estar vazio.");
        }
        
        let parsedData: ExtractedData;
        try {
            // A API retorna o JSON diretamente por causa do responseMimeType
            parsedData = JSON.parse(text);
        } catch (e) {
            console.error("Falha ao analisar a resposta JSON da IA:", text);
            throw new Error("A IA retornou uma resposta em um formato inesperado (não-JSON). Por favor, tente novamente.");
        }

        // Fallbacks para robustez
        parsedData.numeroNF = parsedData.numeroNF || "Não encontrado";
        parsedData.optanteSimples = parsedData.optanteSimples || "Não informado";
        parsedData.isMei = parsedData.isMei || "Não informado";
        parsedData.localServico = parsedData.localServico || "Não encontrado";
        parsedData.municipioIncidencia = parsedData.municipioIncidencia || "Não encontrado";
        parsedData.aliquotaIR = parsedData.aliquotaIR ?? "0";
        parsedData.aliquotaISS = parsedData.aliquotaISS ?? "0";
        parsedData.documentoTipo = parsedData.documentoTipo || 'INDEFINIDO';
        parsedData.codigoReinf = parsedData.codigoReinf || '17099'; // Default 'Demais serviços'
        parsedData.valorINSS = parsedData.valorINSS ?? 0;
        parsedData.baseCalculoINSS = parsedData.baseCalculoINSS ?? 0;
        parsedData.aliquotaINSS = parsedData.aliquotaINSS ?? 0;

        return parsedData;

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
         if (error instanceof Error) {
            // Tenta dar uma mensagem de erro mais útil
            if (error.message.includes('API key not valid')) {
                 throw new Error(`Erro de autenticação. Verifique se a sua chave da API do Gemini está correta.`);
            }
             if (error.message.includes('permission denied')) {
                 throw new Error(`Acesso negado. Verifique as permissões da sua chave de API do Gemini.`);
            }
        }
        throw new Error("Falha de comunicação com a IA do Google Gemini. Verifique sua chave de API e conexão com a internet.");
    }
}
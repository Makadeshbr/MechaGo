import ky from "ky";
import { api } from "./api";
import { tokenStorage } from "./storage";

interface UploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
}

type UploadContext = "diagnosis" | "completion" | "avatar";

/**
 * Enterprise Upload Helper
 * 
 * 1. Pede presigned URL para a API
 * 2. Faz o upload binário direto para o storage (R2 ou Local Fallback)
 * 3. Retorna a URL pública final
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  // 1. Obter Presigned URL (Usa a instância 'api' que tem refresh token automático)
  const response = await api.post("uploads/presigned-url", {
    json: { fileName, contentType, context },
  }).json<UploadResponse>();

  const { uploadUrl, publicUrl } = response;
  
  // LOGS PARA DEBUG NO EXPO GO
  console.log(`[Upload] Destino: ${uploadUrl.includes("r2.cloudflarestorage.com") ? "CLOUDFLARE R2" : "RAILWAY LOCAL"}`);
  console.log(`[Upload] URL: ${uploadUrl.substring(0, 60)}...`);

  // 2. Preparar o arquivo para upload
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  // 3. Executar o Upload (PUT para R2 ou POST para Local)
  try {
    const isLocal = uploadUrl.includes("/local/");
    
    // Configuração de headers
    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    
    if (isLocal) {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
    }

    // Execução do upload binário
    await ky(uploadUrl, {
      method: isLocal ? "post" : "put",
      body: blob,
      headers,
      timeout: 120000, // 2 minutos para uploads em conexões móveis
    });

    return publicUrl;
  } catch (error: any) {
    console.error("[uploadFile] Erro fatal no upload:", error);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) throw new Error("Sessão expirada no envio da foto. Tente novamente.");
      if (status === 413) throw new Error("A imagem é muito grande (limite 10MB).");
      if (status === 403) throw new Error("Acesso negado ao storage. Verifique as chaves R2.");
    }
    throw new Error("Falha na conexão de upload. Verifique seu sinal de internet.");
  }
}

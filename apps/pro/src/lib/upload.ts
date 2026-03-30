// expo-file-system v19 separou a API legada. uploadAsync e FileSystemUploadType
// vivem em 'expo-file-system/legacy' — import correto para SDK 54.
import * as FileSystem from "expo-file-system/legacy";
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
 * Realiza upload de arquivo para R2 (produção) ou fallback local (Railway).
 *
 * Usa expo-file-system/legacy uploadAsync — a API mais confiável do Expo para
 * upload de arquivo, funciona em todos os Android sem os bugs do fetch().blob().
 *
 * Local (Railway): multipart/form-data, campo 'file', método POST.
 * R2 (produção):   binário raw, método PUT (exigido pelo presigned URL do R2).
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  // 1. Obter Presigned URL — usa a instância 'api' com refresh token automático
  const presignedResponse = await api
    .post("uploads/presigned-url", {
      json: { fileName, contentType, context },
    })
    .json<UploadResponse>();

  const { uploadUrl, publicUrl } = presignedResponse;
  const isLocal = uploadUrl.includes("/local/");

  console.log(`[Upload] Storage: ${isLocal ? "RAILWAY LOCAL" : "CLOUDFLARE R2"}`);
  console.log(`[Upload] fileURI: ${uri.substring(0, 80)}`);
  console.log(`[Upload] uploadURL: ${uploadUrl.substring(0, 80)}`);

  // 2. Executar upload via FileSystem.uploadAsync
  let result: FileSystem.FileSystemUploadResult;

  try {
    if (isLocal) {
      // Fallback Railway: multipart/form-data — o servidor Hono lê via body.file
      const accessToken = tokenStorage.getAccessToken();
      result = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: contentType,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } else {
      // R2 presigned PUT: envia binário raw (padrão S3/R2 — não aceita multipart)
      result = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": contentType },
      });
    }
  } catch (networkError) {
    console.error("[Upload] Erro de rede antes de atingir o servidor:", networkError);
    throw new Error(
      "Sem conexão com o servidor de upload. Verifique seu sinal de internet.",
    );
  }

  console.log(`[Upload] HTTP status: ${result.status}`);

  if (result.status === 401) {
    throw new Error("Sessão expirada. Faça login novamente para continuar.");
  }
  if (result.status === 413) {
    throw new Error("A imagem é muito grande. Limite de 10MB.");
  }
  if (result.status === 400) {
    console.error("[Upload] Resposta 400:", result.body);
    throw new Error("Formato de imagem inválido (400). Use JPG ou PNG.");
  }
  if (result.status < 200 || result.status >= 300) {
    console.error(`[Upload] Falha HTTP ${result.status}:`, result.body);
    throw new Error(`Falha no upload (HTTP ${result.status}). Tente novamente.`);
  }

  console.log(`[Upload] Sucesso. publicUrl: ${publicUrl.substring(0, 80)}`);
  return publicUrl;
}

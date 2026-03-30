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
 * Realiza upload de arquivo para R2 (produção) ou fallback local (MVP).
 *
 * Para uploads locais no Railway: usa FormData — método confiável no React Native Android.
 * Para R2: usa PUT binário com presigned URL (padrão S3).
 *
 * O fetch(uri).blob() é instável em Android para URIs de arquivo local,
 * por isso usamos FormData para o caminho local.
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  // 1. Obter Presigned URL — usa a instância 'api' com refresh token automático
  const response = await api
    .post("uploads/presigned-url", {
      json: { fileName, contentType, context },
    })
    .json<UploadResponse>();

  const { uploadUrl, publicUrl } = response;
  const isLocal = uploadUrl.includes("/local/");

  console.log(`[Upload] Storage: ${isLocal ? "RAILWAY LOCAL" : "CLOUDFLARE R2"}`);
  console.log(`[Upload] URI local: ${uri.substring(0, 80)}`);

  try {
    if (isLocal) {
      // Fallback local: FormData é o método mais robusto em React Native Android
      // O campo 'file' corresponde ao que o servidor espera em c.req.parseBody()
      const accessToken = tokenStorage.getAccessToken();
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: contentType,
      } as unknown as Blob);

      await ky.post(uploadUrl, {
        body: formData,
        headers: {
          // Não definir Content-Type — o FormData define automaticamente com boundary
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 120000,
      });
    } else {
      // Produção R2: PUT com binário direto (padrão presigned URL S3/R2)
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();

      await ky.put(uploadUrl, {
        body: blob,
        headers: { "Content-Type": contentType },
        timeout: 120000,
      });
    }

    console.log(`[Upload] Sucesso. URL pública: ${publicUrl.substring(0, 80)}`);
    return publicUrl;
  } catch (error: unknown) {
    console.error("[uploadFile] Erro no upload:", error);

    const httpError = error as { response?: { status?: number } };
    if (httpError?.response?.status) {
      const status = httpError.response.status;
      if (status === 401) throw new Error("Sessão expirada. Faça login novamente para continuar.");
      if (status === 413) throw new Error("A imagem é muito grande. Limite de 10MB.");
      if (status === 400) throw new Error("Formato de imagem inválido. Use JPG ou PNG.");
    }

    throw new Error("Falha no envio da foto. Verifique seu sinal de internet e tente novamente.");
  }
}

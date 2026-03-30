import { api } from "./api";

type UploadContext = "diagnosis" | "completion" | "avatar";

interface UploadResult {
  publicUrl: string;
  fileKey: string;
}

/**
 * Upload de arquivo para o servidor (R2 ou fallback local).
 *
 * O arquivo é enviado como multipart/form-data para a Railway API, que faz
 * o PutObject para o R2 server-side. Elimina os problemas de presigned URL
 * (403 por headers de assinatura incompatíveis com expo-file-system).
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  console.log(`[Upload] Iniciando upload: ${fileName} (${contentType})`);

  // FormData com a URI do arquivo local — React Native serializa nativamente
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: contentType,
  } as unknown as Blob);

  const response = await api
    .post(`uploads?context=${context}`, { body: formData })
    .json<UploadResult>();

  console.log(`[Upload] Sucesso. publicUrl: ${response.publicUrl.substring(0, 80)}`);
  return response.publicUrl;
}

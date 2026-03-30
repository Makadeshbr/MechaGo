import * as FileSystem from "expo-file-system/legacy";
import { api } from "./api";

type UploadContext = "diagnosis" | "completion" | "avatar";

interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
}

/**
 * Upload de arquivo para o Cloudflare R2 via presigned URL.
 *
 * Fluxo enterprise em dois passos:
 *   1. POST /api/v1/uploads/presigned-url → recebe URL temporária do R2
 *   2. PUT direto ao R2 usando FileSystem.uploadAsync (BINARY_CONTENT)
 *
 * O arquivo nunca passa pelo servidor Railway — zero overhead de memória e banda.
 * A URL é assinada com unsignableHeaders para content-type, eliminando o 403
 * causado por divergência de headers entre AWS SDK e clientes móveis nativos.
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  console.log(`[Upload] Iniciando: ${fileName} (${contentType})`);

  // Passo 1: solicitar presigned URL ao backend
  const presigned = await api
    .post("uploads/presigned-url", {
      json: { fileName, contentType, context },
    })
    .json<PresignedUrlResponse>();

  console.log(`[Upload] Presigned URL obtida. fileKey: ${presigned.fileKey}`);

  // Passo 2: PUT direto ao R2 com o binário do arquivo
  const uploadResult = await FileSystem.uploadAsync(presigned.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    console.error(`[Upload] R2 recusou PUT: status ${uploadResult.status}`, uploadResult.body);
    throw new Error(`Upload falhou com status ${uploadResult.status}`);
  }

  console.log(`[Upload] Sucesso. publicUrl: ${presigned.publicUrl.substring(0, 80)}`);
  return presigned.publicUrl;
}

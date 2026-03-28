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
  // 1. Obter Presigned URL
  const response = await api.post("uploads/presigned-url", {
    json: { fileName, contentType, context },
  }).json<UploadResponse>();

  const { uploadUrl, publicUrl } = response;

  // 2. Preparar o arquivo para upload
  // No React Native/Expo, usamos fetch para pegar o blob do arquivo local
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  // 3. Executar o Upload (PUT para R2 ou POST para Local)
  // Se a URL contém "local/", usamos POST e enviamos como binary body ou form-data
  if (uploadUrl.includes("/local/")) {
    const accessToken = tokenStorage.getAccessToken();

    await ky.post(uploadUrl, {
      body: blob,
      headers: {
        "Content-Type": contentType,
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      timeout: 30000,
    });
  } else {
    // Padrão R2/S3: PUT com o arquivo no body
    await ky.put(uploadUrl, {
      body: blob,
      headers: {
        "Content-Type": contentType,
      },
      timeout: 30000,
    });
  }

  return publicUrl;
}

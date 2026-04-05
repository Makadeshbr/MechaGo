import { tokenStorage } from "./storage";

type UploadContext = "diagnosis" | "completion" | "avatar";

interface UploadResult {
  publicUrl: string;
  fileKey: string;
}

// EXPO_PUBLIC_API_URL vem do eas.json; fallback para Railway prod
const DEV_API_URL = "http://192.168.2.100:3000/api/v1";
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
    : __DEV__
      ? DEV_API_URL
      : "https://api-production-f7a8.up.railway.app/api/v1";

/**
 * Upload de arquivo para o servidor (R2 via backend).
 *
 * Usa fetch() nativo do React Native em vez de ky para evitar interferência
 * de headers. O ky pode setar Content-Type incorretamente em uploads
 * multipart, causando falha no parseBody() do Hono no servidor.
 *
 * No React Native, FormData.append aceita o objeto { uri, name, type }
 * e o runtime gera o boundary multipart/form-data automaticamente.
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  contentType: string,
  context: UploadContext,
): Promise<string> {
  const formData = new FormData();

  // React Native FormData aceita esse formato diretamente
  // O runtime resolve a URI do arquivo e faz streaming do binário
  formData.append("file", {
    uri,
    name: fileName,
    type: contentType,
  } as unknown as Blob);

  const token = tokenStorage.getAccessToken();

  // fetch() nativo: NÃO setar Content-Type manualmente.
  // O RN auto-gera "multipart/form-data; boundary=..." correto.
  const response = await fetch(`${API_BASE_URL}/uploads?context=${context}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error ?? body?.message ?? `Upload falhou (HTTP ${response.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  const result: UploadResult = await response.json();
  return result.publicUrl;
}

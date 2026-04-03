/**
 * Inicialização lazy do Firebase Admin SDK.
 *
 * Estratégia de fallback:
 * - Se FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY não estiverem
 *   configurados, o módulo retorna null em vez de quebrar o boot do servidor.
 * - Isso garante que o app suba normalmente em ambientes sem credenciais Firebase
 *   (CI, desenvolvimento local sem notificações push).
 */

import { env } from "@/env";
import { logger } from "@/middleware/logger.middleware";

// Variável de módulo — somente uma instância do SDK por processo
let _app: import("firebase-admin/app").App | null = null;
let _initialized = false;

/**
 * Retorna a instância do Firebase Admin App, inicializando-a na primeira chamada.
 * Retorna null se as credenciais não estiverem configuradas.
 */
function getFirebaseApp(): import("firebase-admin/app").App | null {
  if (_initialized) return _app;
  _initialized = true;

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  // A chave privada vem com \n literal do Railway — precisamos substituir
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn({ msg: "firebase_not_configured" }, "Firebase Admin SDK não está configurado — push desabilitado");
    return null;
  }

  try {
    const { initializeApp, cert, getApps } = require("firebase-admin/app");

    // Evita inicialização duplicada em hot-reload de desenvolvimento
    if (getApps().length > 0) {
      _app = getApps()[0];
      return _app;
    }

    _app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

    logger.info({ msg: "firebase_initialized", projectId }, "Firebase Admin SDK inicializado");
    return _app;
  } catch (err) {
    logger.error({ msg: "firebase_init_error", error: err }, "Falha ao inicializar Firebase Admin SDK");
    return null;
  }
}

/**
 * Retorna o serviço de Messaging do Firebase.
 * Retorna null se o Firebase não estiver configurado.
 */
export function getMessaging(): import("firebase-admin/messaging").Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const { getMessaging: _getMessaging } = require("firebase-admin/messaging");
    return _getMessaging(app);
  } catch (err) {
    logger.error({ msg: "firebase_messaging_error", error: err });
    return null;
  }
}

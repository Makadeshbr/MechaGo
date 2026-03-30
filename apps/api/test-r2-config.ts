
import { z } from "zod";

const envSchema = z.object({
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

const mockEnv = {
  R2_ACCESS_KEY_ID: "030a27f4d2af08e9268487c68128a6a2",
  R2_BUCKET: "mechago-uploads",
  R2_ENDPOINT: "https://a0dfe69527698ceea44f843cada5a1bc.r2.cloudflarestorage.com",
  R2_PUBLIC_URL: "https://pub-f217c172da974addabe4fae6930bbed6.r2.dev",
  R2_SECRET_ACCESS_KEY: "b7694de0848b7c3e172b206d4d82c4266d504aa14c2c85ee31053cf70435a9a5"
};

const result = envSchema.safeParse(mockEnv);

if (result.success) {
  console.log("✅ Validação de chaves R2: SUCESSO");
  const data = result.data;
  const hasConfig = Boolean(
    data.R2_ENDPOINT &&
    data.R2_ACCESS_KEY_ID &&
    data.R2_SECRET_ACCESS_KEY &&
    data.R2_BUCKET &&
    data.R2_PUBLIC_URL
  );
  console.log("✅ R2 Active Status:", hasConfig);
} else {
  console.log("❌ Validação de chaves R2: FALHA");
  console.log(result.error.format());
}

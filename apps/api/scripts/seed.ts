/**
 * Seed idempotente para beta fechado do MechaGo.
 *
 * Execucao: npx tsx scripts/seed.ts
 */
import * as dotenv from "dotenv";
import { join } from "node:path";
import argon2 from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { parseEnv } from "../src/env";
import * as schema from "../src/db/schema";

dotenv.config({ path: join(process.cwd(), ".env") });

const env = parseEnv(process.env);
const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const DEFAULT_PASSWORD = "MechaGo123!";

const USERS = [
  {
    email: "cliente1@example.com",
    name: "Natalia Costa",
    type: "client",
    phone: "11999990001",
    cpfCnpj: "11122233301",
  },
  {
    email: "cliente2@example.com",
    name: "Rafael Lima",
    type: "client",
    phone: "11999990002",
    cpfCnpj: "11122233302",
  },
  {
    email: "cliente3@example.com",
    name: "Camila Rocha",
    type: "client",
    phone: "11999990003",
    cpfCnpj: "11122233303",
  },
  {
    email: "cliente4@example.com",
    name: "Bruno Vieira",
    type: "client",
    phone: "11999990004",
    cpfCnpj: "11122233304",
  },
  {
    email: "cliente5@example.com",
    name: "Larissa Gomes",
    type: "client",
    phone: "11999990005",
    cpfCnpj: "11122233305",
  },
  {
    email: "pro1@example.com",
    name: "Marcos Bateria",
    type: "professional",
    phone: "11988880001",
    cpfCnpj: "99900011101",
  },
  {
    email: "pro2@example.com",
    name: "Fernanda Pneu",
    type: "professional",
    phone: "11988880002",
    cpfCnpj: "99900011102",
  },
  {
    email: "pro3@example.com",
    name: "Diego Diesel",
    type: "professional",
    phone: "11988880003",
    cpfCnpj: "99900011103",
  },
  {
    email: "pro4@example.com",
    name: "Aline Injetora",
    type: "professional",
    phone: "11988880004",
    cpfCnpj: "99900011104",
  },
  {
    email: "pro5@example.com",
    name: "Carlos Guincho",
    type: "professional",
    phone: "11988880005",
    cpfCnpj: "99900011105",
  },
] as const;

const VEHICLES = [
  { userEmail: "cliente1@example.com", type: "car", plate: "BRA2E19", brand: "Volkswagen", model: "Gol", year: 2020, color: "Branco" },
  { userEmail: "cliente2@example.com", type: "suv", plate: "QWE8K41", brand: "Jeep", model: "Compass", year: 2022, color: "Preto" },
  { userEmail: "cliente3@example.com", type: "moto", plate: "MOT3A77", brand: "Honda", model: "CG 160", year: 2021, color: "Vermelho" },
  { userEmail: "cliente4@example.com", type: "car", plate: "XYZ1C55", brand: "Chevrolet", model: "Onix", year: 2019, color: "Prata" },
  { userEmail: "cliente5@example.com", type: "truck", plate: "TRK9P20", brand: "Mercedes-Benz", model: "Accelo", year: 2018, color: "Azul" },
] as const;

const PROFESSIONALS = [
  {
    userEmail: "pro1@example.com",
    type: "mechanic_mobile",
    specialties: ["car_general", "electronic_injection"],
    vehicleTypesServed: ["car", "suv"],
    radiusKm: 12,
    scheduleType: "24h",
    latitude: "-23.5489000",
    longitude: "-46.6388000",
  },
  {
    userEmail: "pro2@example.com",
    type: "tire_repair",
    specialties: ["moto", "car_general"],
    vehicleTypesServed: ["car", "moto", "suv"],
    radiusKm: 15,
    scheduleType: "24h",
    latitude: "-23.5612000",
    longitude: "-46.6550000",
  },
  {
    userEmail: "pro3@example.com",
    type: "mechanic_mobile",
    specialties: ["diesel_truck", "brakes"],
    vehicleTypesServed: ["truck"],
    radiusKm: 25,
    scheduleType: "daytime",
    latitude: "-23.5200000",
    longitude: "-46.6200000",
  },
  {
    userEmail: "pro4@example.com",
    type: "mechanic_workshop",
    specialties: ["electronic_injection", "air_conditioning", "transmission"],
    vehicleTypesServed: ["car", "suv"],
    radiusKm: 10,
    scheduleType: "daytime",
    latitude: "-23.5750000",
    longitude: "-46.6900000",
  },
  {
    userEmail: "pro5@example.com",
    type: "tow_truck",
    specialties: ["car_general"],
    vehicleTypesServed: ["car", "suv", "truck"],
    radiusKm: 30,
    scheduleType: "24h",
    latitude: "-23.5300000",
    longitude: "-46.7000000",
  },
] as const;

/**
 * Rodovias com traçado real como LineString WGS84.
 *
 * Coordenadas derivadas do traçado oficial das rodovias na RMSP/SP.
 * Cada ponto representa um vértice aproximado do eixo da pista,
 * em intervalos de ~5-10km para cobrir o trecho concessionado.
 *
 * A query de detecção usa ST_DWithin(ponto_cliente, path_geometry, 500),
 * classificando como "highway" apenas clientes a ≤ 500m do traçado real.
 */
const ROADWAYS: Array<{
  name: string;
  phone: string;
  emergencyPhone: string;
  boundsMinLat: string;
  boundsMaxLat: string;
  boundsMinLng: string;
  boundsMaxLng: string;
  // WKT do traçado real — alimenta a coluna path_geometry após a migration
  pathWkt: string;
}> = [
  {
    name: "Rodovia dos Bandeirantes",
    phone: "0800 055 5550",
    emergencyPhone: "0800 055 5550",
    // Trecho SP (Km 0 - Limão) → Campinas (Km 100)
    boundsMinLat: "-23.6100000",
    boundsMaxLat: "-23.0000000",
    boundsMinLng: "-47.2500000",
    boundsMaxLng: "-46.7200000",
    pathWkt: "LINESTRING(" +
      "-46.7270 -23.5300," +  // Km 0 — Acesso Norte (Limão)
      "-46.7650 -23.4900," +  // Km 5 — Caieiras
      "-46.8200 -23.4380," +  // Km 12 — Franco da Rocha
      "-46.8750 -23.3540," +  // Km 22 — Campo Limpo Paulista
      "-46.8820 -23.2940," +  // Km 30 — Várzea Paulista
      "-46.8900 -23.2300," +  // Km 38 — Jundiaí (acesso sul)
      "-46.9300 -23.1800," +  // Km 44 — Jundiaí (centro)
      "-47.0000 -23.1200," +  // Km 52 — Louveira
      "-47.0600 -23.0600," +  // Km 62 — Vinhedo
      "-47.1100 -22.9820" +   // Km 75 → Campinas (Km 100)
    ")",
  },
  {
    name: "Rodovia Anhanguera",
    phone: "0800 055 5550",
    emergencyPhone: "0800 055 5550",
    // Trecho SP (Km 0 - Barra Funda) → Campinas (Km 100) — paralela à Bandeirantes pelo sul
    boundsMinLat: "-23.6200000",
    boundsMaxLat: "-22.9500000",
    boundsMinLng: "-47.2600000",
    boundsMaxLng: "-46.7300000",
    pathWkt: "LINESTRING(" +
      "-46.7200 -23.5200," +  // Km 0 — Acesso Barra Funda
      "-46.8350 -23.5250," +  // Km 8 — Carapicuíba
      "-46.8900 -23.4850," +  // Km 14 — Alphaville / Barueri
      "-46.9300 -23.4200," +  // Km 22 — Santana de Parnaíba
      "-46.9400 -23.3600," +  // Km 30 — Pirapora do Bom Jesus
      "-46.9600 -23.2800," +  // Km 40 — Cabreúva
      "-46.9030 -23.1860," +  // Km 52 — Jundiaí (acesso leste)
      "-47.0200 -23.1100," +  // Km 62 — Louveira
      "-47.0620 -22.9060" +   // Km 78 → Campinas
    ")",
  },
  {
    name: "Rodovia Presidente Dutra",
    phone: "0800 017 3536",
    emergencyPhone: "0800 017 3536",
    // Trecho SP (Km 0 - Guarulhos/Marginal) → SJC (Km 90)
    boundsMinLat: "-23.6200000",
    boundsMaxLat: "-22.7000000",
    boundsMinLng: "-46.6500000",
    boundsMaxLng: "-45.9000000",
    pathWkt: "LINESTRING(" +
      "-46.5800 -23.5300," +  // Km 0 — Acesso SP / Guarulhos
      "-46.5500 -23.4980," +  // Km 4 — Cumbica
      "-46.5300 -23.4530," +  // Km 10 — Guarulhos (centro)
      "-46.4800 -23.4100," +  // Km 18 — Guarulhos (norte)
      "-46.3200 -23.3960," +  // Km 32 — Arujá
      "-46.1800 -23.3500," +  // Km 48 — Santa Isabel
      "-46.0600 -23.3200," +  // Km 62 — Guararema
      "-45.9650 -23.3050," +  // Km 74 — Jacareí
      "-45.8900 -23.1790" +   // Km 88 — São José dos Campos
    ")",
  },
  {
    name: "Rodovia Castello Branco",
    phone: "0800 701 5555",
    emergencyPhone: "0800 701 5555",
    // Trecho SP (Km 0 - Osasco) → Sorocaba (Km 110) — sentido oeste
    boundsMinLat: "-23.6400000",
    boundsMaxLat: "-23.1500000",
    boundsMinLng: "-47.5500000",
    boundsMaxLng: "-46.7800000",
    pathWkt: "LINESTRING(" +
      "-46.7870 -23.5570," +  // Km 0 — Acesso Osasco
      "-46.8800 -23.5700," +  // Km 7 — Carapicuíba (sul)
      "-46.9900 -23.5900," +  // Km 16 — Barueri (sul)
      "-47.0710 -23.6030," +  // Km 24 — Cotia
      "-47.1700 -23.5800," +  // Km 34 — Vargem Grande Paulista
      "-47.2880 -23.2630," +  // Km 60 — Itu
      "-47.3800 -23.3200," +  // Km 75 — Porto Feliz
      "-47.4580 -23.4960" +   // Km 90 → Sorocaba
    ")",
  },
  {
    name: "Rodovia Ayrton Senna",
    phone: "0800 055 5510",
    emergencyPhone: "0800 055 5510",
    // Trecho SP (Km 0 - Tatuapé) → Jacareí (Km 75) — sentido leste / litoral
    boundsMinLat: "-23.5900000",
    boundsMaxLat: "-23.1500000",
    boundsMinLng: "-46.5200000",
    boundsMaxLng: "-45.8800000",
    pathWkt: "LINESTRING(" +
      "-46.4800 -23.5000," +  // Km 0 — Acesso Tatuapé / Radial
      "-46.4200 -23.4700," +  // Km 6 — Guarulhos (sul)
      "-46.3500 -23.4200," +  // Km 14 — Guarulhos (leste)
      "-46.2500 -23.3700," +  // Km 26 — Itaquaquecetuba
      "-46.1500 -23.3200," +  // Km 38 — Mogi das Cruzes
      "-46.0200 -23.2500," +  // Km 52 — Suzano
      "-45.9000 -23.1500" +   // Km 68 → Jacareí / Serra
    ")",
  },
];

const PRICE_TABLES = [
  { serviceType: "tire", vehicleType: "car", minPrice: "55.00", maxPrice: "85.00", region: "national" },
  { serviceType: "battery", vehicleType: "car", minPrice: "115.00", maxPrice: "160.00", region: "national" },
  { serviceType: "electric", vehicleType: "car", minPrice: "130.00", maxPrice: "190.00", region: "national" },
  { serviceType: "fuel", vehicleType: "car", minPrice: "95.00", maxPrice: "130.00", region: "national" },
  { serviceType: "other", vehicleType: "truck", minPrice: "180.00", maxPrice: "320.00", region: "national" },
] as const;

async function ensureUsers(passwordHash: string) {
  for (const user of USERS) {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, user.email),
    });

    if (!existing) {
      await db.insert(schema.users).values({
        ...user,
        passwordHash,
        isActive: true,
        isVerified: true,
      });
      console.log(`   user criado: ${user.email}`);
    }
  }
}

async function ensureVehicles() {
  for (const vehicle of VEHICLES) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, vehicle.userEmail),
    });

    if (!user) {
      throw new Error(`Usuario nao encontrado para veiculo: ${vehicle.userEmail}`);
    }

    const existing = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.plate, vehicle.plate),
    });

    if (!existing) {
      await db.insert(schema.vehicles).values({
        userId: user.id,
        type: vehicle.type,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
      });
      console.log(`   veiculo criado: ${vehicle.plate}`);
    }
  }
}

async function ensureProfessionals() {
  for (const professional of PROFESSIONALS) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, professional.userEmail),
    });

    if (!user) {
      throw new Error(`Usuario nao encontrado para profissional: ${professional.userEmail}`);
    }

    const existing = await db.query.professionals.findFirst({
      where: eq(schema.professionals.userId, user.id),
    });

    if (!existing) {
      await db.insert(schema.professionals).values({
        userId: user.id,
        type: professional.type,
        specialties: [...professional.specialties],
        vehicleTypesServed: [...professional.vehicleTypesServed],
        radiusKm: professional.radiusKm,
        scheduleType: professional.scheduleType,
        latitude: professional.latitude,
        longitude: professional.longitude,
        isOnline: true,
        isFounder: true,
      });
      console.log(`   profissional criado: ${professional.userEmail}`);
    }
  }
}

async function ensureRoadways() {
  // Extrai o client postgres nativo para queries raw com geometria PostGIS
  const rawClient = postgres(env.DATABASE_URL, { max: 1 });

  for (const roadway of ROADWAYS) {
    const existing = await db.query.roadwayInfo.findFirst({
      where: eq(schema.roadwayInfo.name, roadway.name),
    });

    // Dados escalares do Drizzle (sem geometry)
    const scalarValues = {
      name: roadway.name,
      phone: roadway.phone,
      emergencyPhone: roadway.emergencyPhone,
      boundsMinLat: roadway.boundsMinLat,
      boundsMaxLat: roadway.boundsMaxLat,
      boundsMinLng: roadway.boundsMinLng,
      boundsMaxLng: roadway.boundsMaxLng,
    };

    if (!existing) {
      // Insere a linha base via Drizzle
      const [inserted] = await db
        .insert(schema.roadwayInfo)
        .values(scalarValues)
        .returning({ id: schema.roadwayInfo.id });

      // Popula path_geometry via SQL raw (Drizzle não suporta geometry nativo)
      await rawClient.unsafe(
        `UPDATE roadway_info
            SET path_geometry = ST_GeomFromText($1, 4326)
          WHERE id = $2`,
        [roadway.pathWkt, inserted.id],
      );

      console.log(`   rodovia criada com geometria real: ${roadway.name}`);
    } else {
      // Rodovia já existe — atualiza apenas a geometria se estiver nula
      await rawClient.unsafe(
        `UPDATE roadway_info
            SET path_geometry = ST_GeomFromText($1, 4326)
          WHERE id = $2
            AND (path_geometry IS NULL)`,
        [roadway.pathWkt, existing.id],
      );

      console.log(`   rodovia ok (geometria atualizada se necessário): ${roadway.name}`);
    }
  }

  await rawClient.end();
}

async function ensurePriceTables() {
  for (const entry of PRICE_TABLES) {
    const existing = await db.query.priceTables.findFirst({
      where: eq(schema.priceTables.serviceType, entry.serviceType),
    });

    if (!existing) {
      await db.insert(schema.priceTables).values(entry);
      console.log(`   price table criada: ${entry.serviceType}/${entry.vehicleType}`);
    }
  }
}

async function main() {
  console.log("Iniciando seed enterprise...");
  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  await ensureUsers(passwordHash);
  await ensureVehicles();
  await ensureProfessionals();
  await ensureRoadways();
  await ensurePriceTables();

  console.log("Seed concluido com sucesso.");
  await client.end();
}

main().catch(async (error) => {
  console.error("Erro no seed:", error);
  await client.end();
  process.exit(1);
});

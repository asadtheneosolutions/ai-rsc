import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string(),
    BINANCE_API_KEY: z.string(),
    BINANCE_API_SECRET: z.string(),
    CMC_API_KEY: z.string(),
    AV_API_KEY: z.string(),
    PROJECT_ID: z.string(),
    ORG_ID: z.string(),
    BEARER_TOKEN: z.string(),
    API_KEY: z.string(),
  },
  client: {},
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
    CMC_API_KEY: process.env.CMC_API_KEY,
    AV_API_KEY: process.env.AV_API_KEY,
    PROJECT_ID: process.env.PROJECT_ID,
    ORG_ID: process.env.ORG_ID,
    BEARER_TOKEN: process.env.BEARER_TOKEN,
    API_KEY: process.env.API_KEY,
  },
});

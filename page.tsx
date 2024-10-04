import { env } from "@/env";
import {} from "ai/rsc";
export default function Home() {
  const EXAMPLE = env.OPEN_AI_API_KEY;
  return (
    <main>
      <h2>Asad</h2>
      {EXAMPLE}
    </main>
  );
}

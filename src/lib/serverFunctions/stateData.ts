
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";

export const StateSchema = z.object({
  name: z.string(),
  abbreviation: z.string().length(2),
});

export const StatesSchema = z.array(StateSchema);

export type State = z.infer<typeof StateSchema>;
export type States = z.infer<typeof StatesSchema>;

export const getStates = createServerFn({ method: "GET" })
  .handler(async () => {
    const filePath = path.join(process.cwd(), "us_states.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    return StatesSchema.parse(parsed);
  });

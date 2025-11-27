import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import fs from 'fs';
import path from 'path';

export const CountrySchema = z.object({
  name: z.string(),
  'alpha-2': z.string(),
  'alpha-3': z.string(),
  'country-code': z.string(),
  'iso_3166-2': z.string(),
  region: z.string().nullable(),
  'sub-region': z.string().nullable(),
  'intermediate-region': z.string().nullable(),
  'region-code': z.string().nullable(),
  'sub-region-code': z.string().nullable(),
  'intermediate-region-code': z.string().nullable(),
});

export const USA_CODE = 'US';

export const CountriesSchema = z.array(CountrySchema);

export type Country = z.infer<typeof CountrySchema>;
export type Countries = z.infer<typeof CountriesSchema>;

export const getCountries = createServerFn({ method: "GET" })
  .handler(async () => {
    const filePath = path.join(process.cwd(), 'all_countries.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(data);
  return CountriesSchema.parse(parsed);
  });

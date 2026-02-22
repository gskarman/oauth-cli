import { z } from "zod";

export const ProviderConfigSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  authorize_url: z.string().url("Must be a valid URL"),
  token_url: z.string().url("Must be a valid URL"),
  revoke_url: z.string().url("Must be a valid URL").optional(),
  scopes: z.array(z.string()).default([]),
  scope_presets: z
    .record(
      z.object({
        description: z.string(),
        scopes: z.array(z.string()),
      }),
    )
    .optional(),
  custom_params: z.record(z.string()).optional(),
  pkce: z.boolean().default(true),
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().optional(),
  redirect_path: z.string().default("/callback"),
  api_base_url: z.string().url("Must be a valid URL").optional(),
  token_request_headers: z.record(z.string()).optional(),
  authorization_method: z.enum(["header", "body"]).default("header"),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export interface StoredProvider {
  id: string;
  config: ProviderConfig;
}

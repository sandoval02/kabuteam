// AI providers the barangay admin can add as extra fallbacks. "openai" kind = the OpenAI-compatible
// chat completions API, which OpenAI, xAI (Grok), Groq, OpenRouter and many others accept.
// Model examples are hints only; IDs change often, and the admin's test shows whether one works.
export const AI_PRESETS = {
  openai: { label: "OpenAI (ChatGPT, Codex)", kind: "openai", baseUrl: "https://api.openai.com/v1", example: "gpt-4.1-mini" },
  anthropic: { label: "Anthropic (Claude)", kind: "anthropic", baseUrl: null, example: "claude-haiku-5-5" },
  gemini: { label: "Google Gemini", kind: "gemini", baseUrl: null, example: "gemini-3.5-flash" },
  xai: { label: "xAI (Grok)", kind: "openai", baseUrl: "https://api.x.ai/v1", example: "grok-4" },
  groq: { label: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", example: "meta-llama/llama-4-scout-17b-16e-instruct" },
  openrouter: { label: "OpenRouter (many models)", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", example: "openai/gpt-4.1-mini" },
  custom: { label: "Other (OpenAI-compatible)", kind: "openai", baseUrl: null, example: "the provider's vision model" },
} as const;

export type PresetKey = keyof typeof AI_PRESETS;
export const PRESET_KEYS = Object.keys(AI_PRESETS) as [PresetKey, ...PresetKey[]];

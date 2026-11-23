"use client";

import { createContext } from "react";
import type { FieldErrors } from "@/lib/validation";

export type FormCtx = { errors: FieldErrors; onBlur: (name: string) => void; onChange: (name: string) => void };
export const FormContext = createContext<FormCtx | null>(null);

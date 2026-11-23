"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Notice, SelectField } from "@/components/ui";
import { FormContext } from "@/components/form-context";
import { AI_PRESETS, PRESET_KEYS, type PresetKey } from "@/lib/extraction/presets";
import { fieldErrorsOf, schemas } from "@/lib/validation";
import { providerAction, type ProviderState } from "./ai-actions";

/** The provider test's log, line by line as the server wrote it; the verdict line is colored. */
export function TestLog({ log }: { log: string[] }) {
  return (
    <ol aria-label="Test log" className="num overflow-x-auto rounded-sm bg-surface-2 px-3 py-2.5 text-small">
      {log.map((line, i) => (
        <li
          key={i}
          className={`whitespace-pre-wrap ${line.startsWith("PASS") ? "font-semibold text-success" : line.startsWith("FAIL") ? "font-semibold text-error" : ""}`}
        >
          {line}
        </li>
      ))}
    </ol>
  );
}

/**
 * Add a fallback provider: "Run test" sends the sample bill to it and shows the log; "Add to the chain"
 * unlocks only after a pass with unchanged settings. Not a ValidatedForm on purpose: React resets a
 * form after a form action, which would wipe the key between the test and the add.
 */
export function AddProviderForm() {
  const [preset, setPreset] = useState<PresetKey>("openai");
  const [state, setState] = useState<ProviderState>({});
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState<"test" | "add" | null>(null);
  const [, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "add" ? "add" : "test";
    const data = new FormData(e.currentTarget);
    data.set("intent", intent);
    data.set("token", state.token ?? "");
    const errors = fieldErrorsOf(schemas.aiProvider, Object.fromEntries(data));
    if (errors) {
      setState({ fieldErrors: errors });
      return;
    }
    setBusy(intent);
    startTransition(async () => {
      const result = await providerAction(data);
      setBusy(null);
      if (result.ok) {
        toast.success(result.ok);
        form.current?.reset();
        setPreset("openai");
        setState({});
        return;
      }
      setState(result);
      setStale(false);
    });
  }

  const spinner = <LoaderCircle size={15} className="animate-spin" aria-hidden />;
  return (
    <FormContext.Provider value={{ errors: state.fieldErrors ?? {}, onBlur: () => {}, onChange: () => {} }}>
      <form ref={form} onSubmit={onSubmit} onInput={() => setStale(true)} noValidate className="flex flex-col gap-4">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <SelectField label="Provider" name="preset" value={preset} onChange={(e) => setPreset(e.target.value as PresetKey)}>
          {PRESET_KEYS.map((k) => (
            <option key={k} value={k}>
              {AI_PRESETS[k].label}
            </option>
          ))}
        </SelectField>
        {preset === "custom" && (
          <Field
            label="API address"
            name="base_url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://api.example.com/v1"
            hint="Must accept OpenAI-style /chat/completions requests with images."
          />
        )}
        <Field
          label="Model"
          name="model"
          autoComplete="off"
          placeholder={`e.g. ${AI_PRESETS[preset].example}`}
          hint="Pick a model that can read images. The test shows whether it works."
        />
        <Field
          label="API key"
          name="api_key"
          type="password"
          autoComplete="off"
          hint="Stored encrypted on the server. Only its last 4 characters are shown after saving."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" value="test" variant="secondary" disabled={busy !== null} aria-busy={busy === "test"}>
            {busy === "test" && spinner}
            {busy === "test" ? "Testing…" : "Run test"}
          </Button>
          <Button type="submit" value="add" disabled={busy !== null || !state.passed || stale} aria-busy={busy === "add"}>
            {busy === "add" && spinner}
            Add to the chain
          </Button>
        </div>
        {state.log ? (
          <TestLog log={state.log} />
        ) : (
          <p className="text-small text-muted">
            The test sends a sample bill photo to the provider and shows what it read. Adding unlocks after it passes.
          </p>
        )}
        {state.passed && stale && <p className="text-small text-warning">You changed a setting after the test. Run it again before adding.</p>}
      </form>
    </FormContext.Provider>
  );
}

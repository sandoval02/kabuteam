"use client";

import { useState } from "react";
import { PhotoCapture, postPhoto } from "@/components/photo-capture";
import { Field, Notice, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { APPLIANCE_TYPES, applianceTypeKeys, type ApplianceExtraction, type ApplianceType } from "@/lib/extraction/schemas";
import { ValidatedForm } from "@/components/form";
import { addAppliance } from "../actions";

type Values = { type: ApplianceType; watts: string; hours: string; inverter: "yes" | "no" | "unknown" };
const defaults = (type: ApplianceType): Values => ({
  type,
  watts: String(APPLIANCE_TYPES[type].watts),
  hours: String(APPLIANCE_TYPES[type].hours),
  inverter: "unknown",
});

export function ApplianceForm() {
  const [values, setValues] = useState<Values>(defaults("aircon"));
  // A fresh form mounts after each save or sticker read. React's automatic form reset would
  // otherwise snap the controlled selects back to their first value (sending the wrong type).
  const [version, setVersion] = useState(0);
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<{ tone: "info" | "warning"; text: string } | null>(null);

  async function onPhoto(file: File) {
    setReading(true);
    setNote(null);
    const { data, error } = await postPhoto<{ extraction: ApplianceExtraction | null }>("/api/extract/appliance", file);
    setReading(false);
    const ex = data?.extraction;
    if (error || !ex) return setNote({ tone: "warning", text: error ?? "Could not read the sticker. Pick the appliance below." });
    if (!ex.readable) return setNote({ tone: "warning", text: "No rating label found. Retake closer to the sticker, or pick below." });
    setVersion((v) => v + 1);
    setValues({
      type: ex.appliance_type,
      watts: ex.watts ? String(Math.round(ex.watts)) : String(APPLIANCE_TYPES[ex.appliance_type].watts),
      hours: String(APPLIANCE_TYPES[ex.appliance_type].hours),
      inverter: ex.is_inverter === null ? "unknown" : ex.is_inverter ? "yes" : "no",
    });
    setNote({
      tone: ex.watts ? "info" : "warning",
      text: ex.watts ? "Read from the sticker. Set how many hours a day you use it." : "Watts not found on the sticker; a typical value is filled in.",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoCapture label={reading ? "Reading sticker…" : "Scan appliance sticker"} onPhoto={onPhoto} disabled={reading} variant="lime" />
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <ValidatedForm
        key={version}
        action={addAppliance}
        schema="appliance"
        onResult={(r) => {
          if (r.ok) {
            setVersion((v) => v + 1);
            setValues(defaults("aircon"));
            setNote(null);
          }
        }}
      >
        <SelectField
          label="Appliance"
          name="type"
          value={values.type}
          onChange={(e) => setValues(defaults(e.target.value as ApplianceType))}
        >
          {applianceTypeKeys.map((k) => (
            <option key={k} value={k}>
              {APPLIANCE_TYPES[k].label}
            </option>
          ))}
        </SelectField>
        <Field label="Name (optional)" name="label" placeholder="e.g. Bedroom aircon" maxLength={40} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Watts"
            name="watts"
            type="number"
            inputMode="numeric"
            min="1"
            max="10000"
            required
            value={values.watts}
            onChange={(e) => setValues({ ...values, watts: e.target.value })}
          />
          <Field
            label="Hours a day"
            name="hours_per_day"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            max="24"
            required
            value={values.hours}
            onChange={(e) => setValues({ ...values, hours: e.target.value })}
          />
        </div>
        <SelectField
          label="Inverter?"
          name="is_inverter"
          value={values.inverter}
          onChange={(e) => setValues({ ...values, inverter: e.target.value as Values["inverter"] })}
        >
          <option value="unknown">Not sure</option>
          <option value="yes">Yes, inverter</option>
          <option value="no">No</option>
        </SelectField>
        <SubmitButton variant="primary" pendingText="Adding…">
          Add appliance
        </SubmitButton>
      </ValidatedForm>
    </div>
  );
}

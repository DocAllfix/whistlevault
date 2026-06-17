import { useRef, useState } from "react";
import { Field as FieldModel } from "../api";
import { loc, useI18n } from "../i18n";
import { Mic, Stop } from "./icons";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label, selectClass } from "./ui/label";
import { Textarea } from "./ui/textarea";

function VoiceRecorder({ onChange }: { onChange: (v: File[]) => void }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        onChange([new File([blob], "registrazione-vocale.webm", { type: "audio/webm" })]);
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setErr(t("mic_error"));
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  return (
    <div>
      {!recording ? (
        <Button type="button" variant="secondary" onClick={start}>
          <Mic size={18} />
          {t("record_voice")}
        </Button>
      ) : (
        <Button type="button" variant="destructive" onClick={stop}>
          <Stop size={18} />
          {t("stop_voice")}
        </Button>
      )}
      {url && <audio controls src={url} className="mt-3 w-full" />}
      {err && <p className="mt-2 text-sm font-semibold text-wv-danger">{err}</p>}
    </div>
  );
}

export type FieldValue = string | string[] | File[];

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldModel;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  const { t, lang } = useI18n();
  const label = loc(field.label, lang);
  const hint = loc(field.hint, lang);
  const id = `f-${field.id}`;
  const describedBy = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {field.required && (
          <span className="ml-1 text-wv-danger" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {hint && (
        <div id={`${id}-hint`} className="mb-2 -mt-1 text-sm text-muted-foreground">
          {hint}
        </div>
      )}
      {renderControl()}
    </div>
  );

  function renderControl() {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea id={id} aria-describedby={describedBy} required={field.required} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        );
      case "date":
        return (
          <Input id={id} type="date" aria-describedby={describedBy} required={field.required} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        );
      case "select":
        return (
          <select id={id} className={selectClass} aria-describedby={describedBy} required={field.required} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t("select_placeholder")}</option>
            {field.options.map((o) => (
              <option key={o.id} value={loc(o.label, lang)}>
                {loc(o.label, lang)}
              </option>
            ))}
          </select>
        );
      case "multiselect":
        return (
          <fieldset className="m-0 border-0 p-0">
            <div className="grid gap-2">
              {field.options.map((o) => {
                const val = loc(o.label, lang);
                const arr = (value as string[]) ?? [];
                const checked = arr.includes(val);
                return (
                  <label
                    key={o.id}
                    htmlFor={`${id}-${o.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-white px-3 py-2.5 font-medium hover:border-wv-border-strong"
                  >
                    <input
                      type="checkbox"
                      id={`${id}-${o.id}`}
                      className="h-5 w-5 accent-wv-accent"
                      checked={checked}
                      onChange={(e) => onChange(e.target.checked ? [...arr, val] : arr.filter((x) => x !== val))}
                    />
                    {val}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      case "file":
        return (
          <Input id={id} type="file" multiple aria-describedby={describedBy} onChange={(e) => onChange(Array.from(e.target.files ?? []))} />
        );
      case "voice":
        return <VoiceRecorder onChange={(files) => onChange(files)} />;
      default:
        return (
          <Input id={id} type="text" aria-describedby={describedBy} required={field.required} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        );
    }
  }
}

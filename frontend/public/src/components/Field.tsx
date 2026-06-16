import { useRef, useState } from "react";
import { Field as FieldModel } from "../api";
import { loc, useI18n } from "../i18n";

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
      <div className="btn-row" style={{ marginTop: 0 }}>
        {!recording ? (
          <button type="button" className="btn btn-secondary" onClick={start}>
            {t("record_voice")}
          </button>
        ) : (
          <button type="button" className="btn btn-danger" onClick={stop}>
            {t("stop_voice")}
          </button>
        )}
      </div>
      {url && <audio controls src={url} style={{ marginTop: 8, width: "100%" }} />}
      {err && <p className="error-text">{err}</p>}
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

  return (
    <div>
      <label htmlFor={id}>
        {label}
        {field.required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {hint && <div className="hint" id={`${id}-hint`}>{hint}</div>}
      {renderControl()}
    </div>
  );

  function describedBy() {
    return hint ? `${id}-hint` : undefined;
  }

  function renderControl() {
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={id}
            aria-describedby={describedBy()}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "date":
        return (
          <input
            id={id}
            type="date"
            aria-describedby={describedBy()}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <select
            id={id}
            aria-describedby={describedBy()}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
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
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            {field.options.map((o) => {
              const val = loc(o.label, lang);
              const arr = (value as string[]) ?? [];
              const checked = arr.includes(val);
              return (
                <div className="checkbox-row" key={o.id}>
                  <input
                    type="checkbox"
                    id={`${id}-${o.id}`}
                    checked={checked}
                    onChange={(e) =>
                      onChange(e.target.checked ? [...arr, val] : arr.filter((x) => x !== val))
                    }
                  />
                  <label htmlFor={`${id}-${o.id}`} style={{ margin: 0 }}>
                    {val}
                  </label>
                </div>
              );
            })}
          </fieldset>
        );
      case "file":
        return (
          <input
            id={id}
            type="file"
            multiple
            aria-describedby={describedBy()}
            onChange={(e) => onChange(Array.from(e.target.files ?? []))}
          />
        );
      case "voice":
        return <VoiceRecorder onChange={(files) => onChange(files)} />;
      default:
        return (
          <input
            id={id}
            type="text"
            aria-describedby={describedBy()}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }
}

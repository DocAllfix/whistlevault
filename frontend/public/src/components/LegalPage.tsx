import { LegalDoc } from "../content/legal";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl [text-wrap:balance]">{doc.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{doc.updated}</p>
      <p className="mt-4 text-lg leading-relaxed text-foreground/80 [text-wrap:pretty]">{doc.intro}</p>
      <div className="mt-8 space-y-7">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl text-wv-navy">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="mt-2 leading-relaxed text-foreground [text-wrap:pretty]">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

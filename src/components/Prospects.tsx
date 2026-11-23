import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { prettyDate } from "../lib/dates";

const stages = ["Primera interacción", "Reunión y propuesta", "Seguimiento", "Servicio cerrado"] as const;
const blank = { name: "", service: "", contact: "", stage: stages[0] as string, meeting_on: "", follow_on: "", follow_type: "", notes: "" };
type Prospect = typeof blank & { id: string };

export function Prospects({ owner }: { owner?: string }) {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [draft, setDraft] = useState<Partial<Prospect> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(owner));
  useEffect(() => {
    let active = true;
    if (owner && supabase) {
      supabase.from("prospects").select("*").eq("owner_id", owner).order("name").then(({data, error}) => {
        if (!active) return;
        if (error) setError("No se pudo cargar el CRM: " + error.message);
        else setRows(data as Prospect[]);
        setLoading(false);
      });
    }
    return () => { active = false; };
  }, [owner]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !owner || !supabase || busy) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(Object.keys(blank).map(key => [key, String(form.get(key) ?? "").trim() || null]));
    if (!values.name || !values.service) { setError("Ingresa el nombre y el servicio de interés."); return; }
    setBusy(true);
    const query = draft.id
      ? supabase.from("prospects").update(values).eq("id", draft.id).eq("owner_id", owner)
      : supabase.from("prospects").insert({...values, owner_id: owner});
    const result = await query.select("*").single();
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setRows(current => [...current.filter(row => row.id !== result.data.id), result.data as Prospect].sort((a,b) => a.name.localeCompare(b.name)));
    setError("");
    setDraft(null);
  }

  return <section className="panel prospect-panel">
    <div className="page-head"><h2>CRM de prospectos</h2><button className="button primary" disabled={loading || !owner || !!draft} onClick={() => setDraft(blank)}>Nuevo prospecto</button></div>
    {error && <p role="alert">{error}</p>}
    {draft && <form className="form-grid" onSubmit={submit}>
      {([["name","Nombre o empresa"],["service","Servicio de interés"],["contact","Datos de contacto"],["meeting_on","Fecha de reunión"],["follow_on","Próximo seguimiento"],["follow_type","Tipo de seguimiento"]] as const).map(([key,label]) =>
        <label key={key} className="field"><span>{label}</span><input name={key} defaultValue={draft[key] ?? ""} required={key==="name" || key==="service"} type={key.endsWith("_on")?"date":"text"} /></label>)}
      <label className="field"><span>Fase</span><select name="stage" defaultValue={draft.stage}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
      <label className="field"><span>Notas</span><textarea name="notes" defaultValue={draft.notes ?? ""}/></label>
      <button className="button primary" disabled={busy}>Guardar prospecto</button><button type="button" className="button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>
    </form>}
    {loading ? <p>Cargando prospectos…</p> : <div className="prospect-stages">{stages.map(stage => <section key={stage}><h3>{stage}</h3>
      {rows.filter(row => row.stage === stage).map(row => <button className="task-row" key={row.id} disabled={!!draft} onClick={() => setDraft(row)}><span>{row.name}<small>{row.service}</small>{row.meeting_on && <small>Reunión · {prettyDate(row.meeting_on)}</small>}{row.follow_on && <small>{row.follow_type || "Seguimiento"} · {prettyDate(row.follow_on)}</small>}</span></button>)}
      {!rows.some(row => row.stage === stage) && <p className="muted-small">Sin prospectos</p>}
    </section>)}</div>}
  </section>;
}

"use client";
import { Protection } from "./protection";
import Items from "./items";
import Preferences from "./preferences";
import { useState, useEffect, type FormEvent } from "react";

type Purchase = {
  sources?: string[];
  id: string;
  merchant: string;
  date: string;
  currency: string;
  orderNumber: string;
  items: { name: string; minor: string }[];
  notes: string;
  archived: boolean;
};
async function request(path: string, method = "GET", data?: unknown) {
  const res = await fetch(`/api/v1/${path}`, {
    method,
    headers: data ? { "content-type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(
      res.status === 401
        ? "Please sign in."
        : res.status === 409
          ? "This record already exists."
          : "Unable to save or load this record. Check the fields and try again.",
    );
  return res.status === 204 ? null : (await res.json()).data;
}
export default function Vault() {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [store, setStore] = useState(""),
    [after, setAfter] = useState(""),
    [view, setView] = useState("cards");
  const [artifact, setArtifact] = useState("");
  const [user, setUser] = useState(""),
    [ready, setReady] = useState(false),
    [register, setRegister] = useState(false),
    [message, setMessage] = useState(""),
    [records, setRecords] = useState<Purchase[]>([]),
    [selected, setSelected] = useState<Purchase | null>(null),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState(false);
  useEffect(() => {
    request("me")
      .then((u) => setUser(u.email))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  async function refresh() {
    setRecords(await request("purchases"));
  }
  useEffect(() => {
    if (user)
      request("purchases")
        .then(setRecords)
        .catch((e) => setMessage(e.message));
  }, [user]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (key: string) => String(f.get(key) ?? "");
    try {
      if (!user) {
        const data = await request(
          `auth/${register ? "register" : "login"}`,
          "POST",
          { email: val("email"), password: val("password") },
        );
        setUser(data.email);
        setMessage("");
        return;
      }
      await request(
        artifact
          ? `extractions/${artifact}/confirm`
          : `purchases${selected ? `/${selected.id}` : ""}`,
        selected ? "PATCH" : "POST",
        {
          merchant: val("merchant"),
          date: val("date"),
          orderNumber: val("orderNumber"),
          currency: val("currency"),
          items: f.getAll("name").map((name, i) => ({
            name: String(name),
            minor: String(f.getAll("minor")[i]),
          })),
          notes: val("notes"),
          archived: false,
        },
      );
      setArtifact("");
      await refresh();
      setSelected(null);
      setEdit(false);
      setMessage("Purchase saved.");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }
  async function importReceipt(file: File) {
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/v1/artifacts/upload", {
        method: "POST",
        body,
      });
      if (!response.ok)
        throw new Error("Upload failed. Use a supported file under 10 MB.");
      const { data } = await response.json();
      const history: {
        field: string;
        value: string;
        status: string;
      }[] = await request(`artifacts/${data.id}/review`);
      if (history.some((row) => row.status === "confirmed")) {
        setMessage("This receipt has already been confirmed.");
        return;
      }
      setDraft(
        Object.fromEntries(history.map((row) => [row.field, row.value])),
      );
      setArtifact(data.id);
      setSelected(null);
      setEdit(true);
      setMessage(
        "Review your receipt and enter the purchase details. AI extraction is unavailable.",
      );
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  const matches = records.filter(
    (p) =>
      JSON.stringify(p).toLowerCase().includes(search.toLowerCase()) &&
      (!store || p.merchant === store) &&
      (!after || p.date >= after),
  );
  if (!ready) return <output>Opening your vault…</output>;
  return (
    <div className="vault">
      <h1>
        {user
          ? "Purchase vault"
          : register
            ? "Create your journal"
            : "Welcome back"}
      </h1>
      <output>{message}</output>
      {!user ? (
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={12}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
          </label>
          <button type="submit">
            {register ? "Create account" : "Sign in"}
          </button>
          <button type="button" onClick={() => setRegister(!register)}>
            {register ? "Use existing account" : "Create an account"}
          </button>
        </form>
      ) : (
        <>
          <label
            className="receipt-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void importReceipt(file);
            }}
          >
            Import receipt
            <input
              id="receipt-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,text/plain"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (file) void importReceipt(file);
              }}
            />
          </label>
          <div hidden={edit}>
            <Preferences
              initialGuide={register}
              onEntry={() => {
                setArtifact("");
                setSelected(null);
                setEdit(true);
              }}
              onImport={() => document.getElementById("receipt-file")?.click()}
            />
          </div>
          <nav aria-label="Purchase vault actions">
            <a href="/cases">Recovery cases</a>
            <a href="/protection">Protection center</a>
            <button
              type="button"
              onClick={() => {
                setArtifact("");
                setSelected(null);
                setEdit(true);
              }}
            >
              Add purchase
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await request("auth/logout", "POST");
                  setUser("");
                  setRecords([]);
                  setArtifact("");
                  setSelected(null);
                  setEdit(false);
                  setMessage("Signed out.");
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              Sign out
            </button>
          </nav>
          <div
            className={artifact && edit ? "receipt-studio" : "vault-content"}
          >
            {artifact && edit && (
              <div>
                <iframe
                  title="Original receipt"
                  sandbox=""
                  src={`/api/v1/artifacts/${artifact}/preview`}
                />
                <a href={`/api/v1/artifacts/${artifact}/download`}>
                  Download source receipt
                </a>
              </div>
            )}
            {edit ? (
              <form
                key={artifact || selected?.id || "new"}
                onSubmit={submit}
                onBlur={async (e) => {
                  const input = e.target;
                  if (
                    !artifact ||
                    !(input instanceof HTMLInputElement) ||
                    !input.name
                  )
                    return;
                  const key =
                    input.name === "name" || input.name === "minor"
                      ? "items." +
                        Array.from(
                          input.form?.querySelectorAll(
                            `[name="${input.name}"]`,
                          ) ?? [],
                        ).indexOf(input) +
                        "." +
                        input.name
                      : input.name;
                  try {
                    await request(`artifacts/${artifact}/review`, "POST", {
                      field: key,
                      value: input.value,
                    });
                  } catch {
                    setMessage(
                      "Draft field could not be saved. Review before confirming.",
                    );
                  }
                }}
              >
                <h2>{selected ? "Edit purchase" : "New purchase"}</h2>
                {[
                  ["merchant", "Merchant", selected?.merchant],
                  ["date", "Purchase date", selected?.date],
                  ["orderNumber", "Order number", selected?.orderNumber],
                  ["currency", "Currency", selected?.currency ?? "USD"],
                  ["notes", "Notes", selected?.notes],
                ].map(([key, label, value]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      type={key === "date" ? "date" : "text"}
                      required={key !== "notes" && key !== "orderNumber"}
                      defaultValue={
                        (artifact && key ? draft[key] : undefined) ?? value
                      }
                    />
                  </label>
                ))}
                <Items
                  initial={
                    selected?.items ??
                    (artifact
                      ? Array.from(
                          {
                            length: Math.max(
                              1,
                              ...Object.keys(draft)
                                .filter((k) => k.startsWith("items."))
                                .map((k) => Number(k.split(".")[1]) + 1),
                            ),
                          },
                          (_, i) => ({
                            name: draft[`items.${i}.name`] ?? "",
                            minor: draft[`items.${i}.minor`] ?? "",
                          }),
                        )
                      : [{ name: "", minor: "" }])
                  }
                />
                <button type="submit">Save purchase</button>
                <button type="button" onClick={() => setEdit(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <label>
                  Search purchases
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="vault-filters">
                  <label>
                    Merchant
                    <select
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                    >
                      <option value="">All merchants</option>
                      {Array.from(new Set(records.map((p) => p.merchant)))
                        .sort()
                        .map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Purchased since
                    <input
                      type="date"
                      value={after}
                      onChange={(e) => setAfter(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    aria-pressed={view === "list"}
                    onClick={() => setView(view === "cards" ? "list" : "cards")}
                  >
                    Compact list
                  </button>
                </div>
                <section
                  className={
                    view === "cards" ? "purchase-cards" : "purchase-list"
                  }
                >
                  {records.length === 0 ? (
                    <p>Your vault is empty. Add your first purchase.</p>
                  ) : matches.length === 0 ? (
                    <p>No purchases match your search.</p>
                  ) : (
                    matches.map((p) => (
                      <article id={`purchase-${p.id}`} key={p.id}>
                        <div className="merchant-heading">
                          <span aria-hidden="true">
                            {p.merchant.slice(0, 1)}
                          </span>
                          <h2>{p.merchant}</h2>
                        </div>
                        <Protection purchase={p} />
                        <p>
                          {p.date} · {p.items.map((i) => i.name).join(", ")}
                        </p>
                        <details>
                          <summary>Purchase details</summary>
                          <dl>
                            <dt>Order number</dt>
                            <dd>{p.orderNumber || "Unrecorded"}</dd>
                            <dt>Items and amounts</dt>
                            <dd>
                              <ul>
                                {p.items.map((item, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: Confirmed receipt positions identify immutable display rows within this snapshot.
                                  <li key={i}>
                                    {item.name} · {item.minor} minor units (
                                    {p.currency})
                                  </li>
                                ))}
                              </ul>
                            </dd>
                            <dt>Notes</dt>
                            <dd>{p.notes || "None"}</dd>
                          </dl>
                          {p.sources?.map((id) => (
                            <a
                              key={id}
                              href={`/api/v1/artifacts/${id}/preview`}
                            >
                              View source receipt
                            </a>
                          ))}
                        </details>
                        <button
                          type="button"
                          onClick={() => {
                            setArtifact("");
                            setSelected(p);
                            setEdit(true);
                          }}
                        >
                          Edit {p.merchant}
                        </button>
                      </article>
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

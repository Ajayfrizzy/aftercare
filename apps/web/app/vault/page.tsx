"use client";
import Preferences from "./preferences";
import { useState, useEffect, type FormEvent } from "react";

type Purchase = {
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
  const res = await fetch("/api/v1/" + path, {
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
          "auth/" + (register ? "register" : "login"),
          "POST",
          { email: val("email"), password: val("password") },
        );
        setUser(data.email);
        setMessage("");
        return;
      }
      await request(
        artifact
          ? "extractions/" + artifact + "/confirm"
          : "purchases" + (selected ? "/" + selected.id : ""),
        selected ? "PATCH" : "POST",
        {
          merchant: val("merchant"),
          date: val("date"),
          orderNumber: val("orderNumber"),
          currency: val("currency"),
          items: [
            { name: val("name"), minor: val("minor") },
            ...(selected?.items.slice(1) ?? []),
          ],
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
          <label>
            Import receipt
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                try {
                  const response = await fetch("/api/v1/artifacts/upload", {
                    method: "POST",
                    body,
                  });
                  if (!response.ok)
                    throw new Error(
                      "Upload failed. Use a supported file under 10 MB.",
                    );
                  const { data } = await response.json();
                  setArtifact(data.id);
                  setSelected(null);
                  setEdit(true);
                  setMessage(
                    "Review your receipt and enter the purchase details. AI extraction is unavailable.",
                  );
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            />
          </label>
          {artifact && (
            <a href={"/api/v1/artifacts/" + artifact + "/download"}>
              Download source receipt
            </a>
          )}
          <Preferences />
          <nav>
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
          {edit ? (
            <form key={selected?.id ?? "new"} onSubmit={submit}>
              <h2>{selected ? "Edit purchase" : "New purchase"}</h2>
              {[
                ["merchant", "Merchant", selected?.merchant],
                ["date", "Purchase date", selected?.date],
                ["orderNumber", "Order number", selected?.orderNumber],
                ["currency", "Currency", selected?.currency ?? "USD"],
                ["name", "Item", selected?.items[0]?.name],
                ["minor", "Price in minor units", selected?.items[0]?.minor],
                ["notes", "Notes", selected?.notes],
              ].map(([key, label, value]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type={key === "date" ? "date" : "text"}
                    required={key !== "notes" && key !== "orderNumber"}
                    defaultValue={value}
                  />
                </label>
              ))}
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
              <section>
                {records.length === 0 ? (
                  <p>Your vault is empty. Add your first purchase.</p>
                ) : (
                  records
                    .filter((p) =>
                      JSON.stringify(p)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <article key={p.id}>
                        <h2>{p.merchant}</h2>
                        <p>
                          {p.date} · {p.items.map((i) => i.name).join(", ")}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
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
        </>
      )}
    </div>
  );
}

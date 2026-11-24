// Inject the Sprite-discovered grant and transport only after the account gate clears.
export async function researchPolicy(
  base: URL,
  merchantDomain: string,
  region: string,
  transport: typeof fetch,
) {
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(merchantDomain))
    throw Error("Merchant domain required");
  const post = async (path: string, payload: unknown) => {
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${path}`;
    const res = await transport(url, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error("Research unavailable");
    return res.json();
  };
  const search = await post("search", {
    query: `${merchantDomain} return warranty price adjustment policy ${region}`,
    include_domains: [merchantDomain],
    search_depth: "basic",
    max_results: 3,
  });
  const urls = (search.results ?? [])
    .map((r: { url: string }) => new URL(r.url))
    .filter(
      (u: URL) =>
        u.protocol === "https:" &&
        u.hostname === merchantDomain &&
        !/(?:reseller|wholesale|distributor)/i.test(u.pathname) &&
        !u.username &&
        !u.password,
    )
    .map((u: URL) => u.href);
  if (!urls.length) return [];
  const extracts = await post("extract", { urls, extract_depth: "basic" });
  return extracts.results
    .filter(
      (r: { url: string; raw_content: string }) =>
        urls.includes(r.url) &&
        typeof r.raw_content === "string" &&
        !/reseller agreement|wholesale agreement|distributor agreement/i.test(
          r.raw_content,
        ) &&
        /return|refund|warranty|price adjustment/i.test(r.raw_content),
    )
    .map((r: { url: string; raw_content: string }) => ({
      source: r.url,
      text: r.raw_content.slice(0, 8000),
      retrievedAt: new Date().toISOString(),
      status: "unreviewed",
    }));
}

export async function recallNotices(
  brand: string,
  model: string,
  transport: typeof fetch,
) {
  type Notice = {
    URL: string;
    Title: string;
    RecallDate: string;
    Products: { Model?: string; Name?: string }[];
    Manufacturers: { Name?: string }[];
  };
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  async function lookup(field: string, value: string): Promise<Notice[]> {
    const url = new URL("https://www.saferproducts.gov/RestWebServices/Recall");
    url.search = new URLSearchParams({
      format: "json",
      [field]: value,
    }).toString();
    const res = await transport(url, {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error("Recall service unavailable");
    const rows: Notice[] = await res.json();
    return rows.filter((r) => {
      const source = URL.canParse(r.URL) ? new URL(r.URL) : null;
      return (
        source?.origin === "https://www.cpsc.gov" &&
        source.pathname.toLowerCase().startsWith("/recalls/")
      );
    });
  }
  const exact = (await lookup("ProductModel", model)).filter(
    (r) =>
      r.Products?.some((p) => norm(p.Model ?? "") === norm(model)) &&
      r.Manufacturers?.some((m) => norm(m.Name ?? "") === norm(brand)),
  );
  const product = norm(model).startsWith(norm(brand) + " ")
    ? norm(model)
    : norm(brand + " " + model);
  const rows = exact.length
    ? exact
    : (await lookup("ProductName", product)).filter((r) =>
        r.Products?.some((p) => {
          const name = norm(p.Name ?? "");
          return name === product || name.startsWith(product + " ");
        }),
      );
  return rows.map((r) => ({
    source: r.URL,
    publishedAt: r.RecallDate,
    title: r.Title,
    retrievedAt: new Date().toISOString(),
    identity: exact.length
      ? "Structured manufacturer and model match. Check the notice for unit-specific restrictions."
      : "Product-name candidate. Confirm the exact model, serial number and affected range in the official notice.",
  }));
}

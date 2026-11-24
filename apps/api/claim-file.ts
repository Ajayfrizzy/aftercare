import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
type Attachment = { id: string; sha: string; mime: string; base64: string };
type Claim = {
  recipient: string;
  body: string;
  version: number;
  attachments: Attachment[];
};
function filename(file: Attachment) {
  const extensions: Record<string, string> = {
    "text/plain": "txt",
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  return `receipt-${file.id}.${extensions[file.mime] ?? "bin"}`;
}
export async function renderClaim(
  format: "pdf" | "eml",
  claim: Claim,
): Promise<Buffer> {
  const title = `Recovery claim · version ${claim.version}`;
  const letter = `Intended recipient: ${claim.recipient}\n\n${claim.body}`;
  const notice =
    "Selected receipt attachments are unchanged originals and may contain personal information.";
  if (format === "eml") {
    const boundary = "aftercare-" + randomUUID();
    const encode = (text: string) => Buffer.from(text).toString("base64");
    const wrap = (encoded: string) =>
      encoded.match(/.{1,76}/g)?.join("\r\n") ?? "";
    const lines = [
      "X-Unsent: 1",
      "MIME-Version: 1",
      "Subject: =?UTF-8?B?" + encode(title) + "?=",
    ];
    if (
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(claim.recipient)
    )
      lines.push("To: " + claim.recipient);
    lines.push(
      'Content-Type: multipart/mixed; boundary="' + boundary + '"',
      "",
      "--" + boundary,
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrap(encode(letter + (claim.attachments.length ? "\n\n" + notice : ""))),
    );
    for (const f of claim.attachments)
      lines.push(
        "--" + boundary,
        "Content-Type: " + f.mime,
        'Content-Disposition: attachment; filename="' + filename(f) + '"',
        "Content-Transfer-Encoding: base64",
        "",
        wrap(f.base64),
      );
    return Buffer.from([...lines, "--" + boundary + "--", ""].join("\r\n"));
  }
  const Printer = require("pdfmake");
  const font = Buffer.from(
    require("pdfmake/build/vfs_fonts.js")["Roboto-Regular.ttf"],
    "base64",
  );
  const doc = new Printer({ Roboto: { normal: font } }).createPdfKitDocument({
    info: { title },
    content: [
      { text: title, fontSize: 19, margin: [0, 0, 0, 16] },
      letter,
      ...(claim.attachments.length ? [notice] : []),
      ...claim.attachments.map((f) => filename(f) + " · SHA-256 " + f.sha),
    ],
  });
  const parts: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => parts.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(parts)));
  });
  for (const f of claim.attachments)
    doc.file(Buffer.from(f.base64, "base64"), {
      name: filename(f),
      type: f.mime,
      description: "Original receipt",
    });
  doc.end();
  return finished;
}

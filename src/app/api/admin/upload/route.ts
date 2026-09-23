import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isAcceptedType, maxBytesFor, storeMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Uploads go through a route handler rather than a server action: actions cap request
 * bodies at 1 MB by default, which a PDF would blow straight past.
 */
export async function POST(request: Request) {
  const user = await requireAdmin();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "That upload couldn't be read." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file was attached." }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!isAcceptedType(contentType)) {
    return NextResponse.json(
      { ok: false, error: "Only JPEG, PNG, WebP images and PDFs can be uploaded." },
      { status: 400 },
    );
  }

  const limit = maxBytesFor(contentType);
  if (file.size > limit) {
    return NextResponse.json(
      { ok: false, error: `That file is too large — the limit is ${Math.round(limit / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }

  const alt = String(form.get("alt") ?? "").trim();
  const isImage = contentType !== "application/pdf";
  if (isImage && !alt) {
    return NextResponse.json(
      { ok: false, error: "Describe the photo before uploading — it's read aloud to people using a screen reader." },
      { status: 400 },
    );
  }

  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;

  try {
    const media = await storeMedia({
      bytes: await file.arrayBuffer(),
      contentType,
      alt: alt || null,
      creditText: String(form.get("creditText") ?? "").trim() || null,
      creditUrl: String(form.get("creditUrl") ?? "").trim() || null,
      width,
      height,
      uploadedBy: user.email,
    });
    return NextResponse.json({ ok: true, media });
  } catch (error) {
    console.error("[upload] failed", error);
    return NextResponse.json({ ok: false, error: "We couldn't save that file." }, { status: 500 });
  }
}

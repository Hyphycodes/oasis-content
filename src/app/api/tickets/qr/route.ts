import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token || !/^[a-zA-Z0-9_-]{8,160}$/.test(token)) return Response.json({ error: "Invalid ticket." }, { status: 400 });
  const payload = `${origin}/check-in?ticket=${encodeURIComponent(token)}`;
  const png = await QRCode.toBuffer(payload, { width: 460, margin: 2, color: { dark: "#183e35", light: "#fffdf8" }, errorCorrectionLevel: "H" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}

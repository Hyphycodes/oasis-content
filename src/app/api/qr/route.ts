import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const value = searchParams.get("value");
  if (!value || value.length > 500 || !value.startsWith("/e/"))
    return Response.json({ error: "Invalid promoter link." }, { status: 400 });
  const png = await QRCode.toBuffer(`${origin}${value}`, {
    width: 640,
    margin: 3,
    color: { dark: "#183e35", light: "#fffdf8" },
    errorCorrectionLevel: "H",
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="oasis-promoter-qr.png"',
      "Cache-Control": "private, no-store",
    },
  });
}

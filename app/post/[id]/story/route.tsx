import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getPostById } from "@/lib/db";
import { CATEGORY_MAP, cityName } from "@/lib/data";

// Imagen vertical 1080x1920 lista para Historias de Instagram / Estados de WhatsApp.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const postUrl = `${origin}/post/${post.id}`;
  const qr = await QRCode.toDataURL(postUrl, {
    margin: 1,
    width: 440,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  const isNeed = post.type === "need";
  const accent = isNeed ? "#e11d48" : "#059669";
  const typeLabel = isNeed ? "NECESITA AYUDA" : "OFRECE AYUDA";
  const category = CATEGORY_MAP[post.category]?.label ?? "Ayuda";
  const place = cityName(post.city) + (post.zone ? ` · ${post.zone}` : "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Franja tricolor */}
        <div style={{ display: "flex", height: "16px", width: "100%" }}>
          <div style={{ flex: 1, background: "#FCD116" }} />
          <div style={{ flex: 1, background: "#0033A0" }} />
          <div style={{ flex: 1, background: "#CF142B" }} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "80px",
          }}
        >
          <div style={{ display: "flex", fontSize: "44px", fontWeight: 800, color: "#1e3a8a" }}>
            Enlaza Venezuela
          </div>

          {post.trapped && (
            <div
              style={{
                display: "flex",
                marginTop: "40px",
                background: "#e11d48",
                color: "#ffffff",
                fontSize: "40px",
                fontWeight: 800,
                padding: "16px 28px",
                borderRadius: "16px",
                alignSelf: "flex-start",
              }}
            >
              PERSONAS ATRAPADAS
            </div>
          )}

          <div
            style={{
              display: "flex",
              marginTop: "40px",
              background: accent,
              color: "#ffffff",
              fontSize: "40px",
              fontWeight: 800,
              padding: "14px 32px",
              borderRadius: "999px",
              alignSelf: "flex-start",
            }}
          >
            {typeLabel}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "40px",
              fontSize: "76px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.1,
            }}
          >
            {post.title.slice(0, 120)}
          </div>

          <div style={{ display: "flex", marginTop: "28px", fontSize: "40px", color: "#57534e" }}>
            {category}
          </div>
          {post.address && (
            <div style={{ display: "flex", marginTop: "16px", fontSize: "38px", color: "#1c1917", fontWeight: 600 }}>
              {post.address.slice(0, 90)}
            </div>
          )}
          <div style={{ display: "flex", marginTop: "16px", fontSize: "36px", color: "#78716c" }}>
            {place}
          </div>

          {/* QR */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "28px",
                background: "#ffffff",
                border: "4px solid #e7e5e4",
                borderRadius: "28px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={440} height={440} alt="QR" />
            </div>
            <div style={{ display: "flex", marginTop: "28px", fontSize: "40px", fontWeight: 700, color: "#1c1917" }}>
              Escanea para ver y contactar
            </div>
            <div style={{ display: "flex", marginTop: "8px", fontSize: "34px", color: "#78716c" }}>
              enlazavenezuela.com
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: "16px", width: "100%", background: "#e11d48" }} />
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}

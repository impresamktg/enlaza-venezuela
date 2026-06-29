import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { listPosts, listRescued } from "@/lib/db";
import { listPool } from "@/lib/pool";
import { isRescueClosed } from "@/lib/types";

export const dynamic = "force-dynamic";

// Imagen vertical 1080x1920 para difundir el PROYECTO (no una publicación) en
// Historias de Instagram / Estados de WhatsApp: titular, cifras en vivo y QR.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const homeUrl = `${origin}/`;

  let needs = 0;
  let offers = 0;
  let rescued = 0;
  try {
    const [posts, pool, rescuedList] = await Promise.all([
      listPosts(),
      listPool(),
      listRescued(),
    ]);
    const open = [...posts, ...pool].filter((p) => !isRescueClosed(p.rescue_state));
    needs = open.filter((p) => p.type === "need").length;
    offers = open.filter((p) => p.type === "offer").length;
    rescued = rescuedList.length;
  } catch {
    // Si la BD falla, la imagen se genera igual, sin cifras.
  }

  const qr = await QRCode.toDataURL(homeUrl, {
    margin: 1,
    width: 440,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  const stats: { value: number; label: string; color: string }[] = [
    { value: needs, label: "solicitudes activas", color: "#e11d48" },
    { value: offers, label: "ofertas de ayuda", color: "#059669" },
    { value: rescued, label: "rescatados", color: "#1e3a8a" },
  ];

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

          <div
            style={{
              display: "flex",
              marginTop: "24px",
              background: "#fff1f2",
              color: "#be123c",
              fontSize: "34px",
              fontWeight: 700,
              padding: "12px 28px",
              borderRadius: "999px",
              alignSelf: "flex-start",
            }}
          >
            Emergencia · Terremotos del 24 de junio de 2026
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "44px",
              fontSize: "92px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.05,
            }}
          >
            ¿Necesitas ayuda o puedes ayudar?
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "32px",
              fontSize: "42px",
              color: "#57534e",
              lineHeight: 1.3,
            }}
          >
            Conectamos directamente, por WhatsApp, a quien necesita algo con quien
            puede ofrecerlo.
          </div>

          {/* Cifras en vivo */}
          <div style={{ display: "flex", gap: "24px", marginTop: "56px" }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  background: "#f7f7f6",
                  borderRadius: "28px",
                  padding: "32px 24px",
                }}
              >
                <div style={{ display: "flex", fontSize: "72px", fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ display: "flex", marginTop: "8px", fontSize: "30px", color: "#78716c" }}>
                  {s.label}
                </div>
              </div>
            ))}
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
            <div style={{ display: "flex", marginTop: "28px", fontSize: "44px", fontWeight: 700, color: "#1c1917" }}>
              Escanea para entrar y publicar
            </div>
            <div style={{ display: "flex", marginTop: "8px", fontSize: "36px", color: "#78716c" }}>
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

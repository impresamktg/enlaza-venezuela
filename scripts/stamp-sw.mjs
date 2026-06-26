// Sella una versión única en public/sw.js en cada build (corre en `prebuild`).
// Sin esto, el archivo del service worker tendría los mismos bytes en cada
// despliegue → el navegador no detecta una versión nueva → los usuarios con la
// PWA instalada seguirían viendo la UI vieja y las cachés no se limpiarían.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SW = new URL("../public/sw.js", import.meta.url);

let sha = "";
try {
  sha = execSync("git rev-parse --short HEAD", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  // sin git (CI sin historial, export estático…): solo timestamp
}
// El commit identifica el código; el timestamp distingue rebuilds del mismo commit.
const version = `${sha ? sha + "-" : ""}${Date.now()}`;

const src = readFileSync(SW, "utf8");
const re = /const VERSION = "[^"]*";/;
if (!re.test(src)) {
  console.error('stamp-sw: no se encontró `const VERSION = "...";` en public/sw.js');
  process.exit(1);
}
writeFileSync(SW, src.replace(re, `const VERSION = "${version}";`));
console.log(`stamp-sw: VERSION = ${version}`);

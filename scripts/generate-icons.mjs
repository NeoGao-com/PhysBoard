import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT = process.cwd();

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bgGrad" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </radialGradient>
    <linearGradient id="orbA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="orbB" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" rx="220" fill="url(#bgGrad)" />
  <!-- Subtle chalkboard coordinate grid -->
  <g stroke="#334155" stroke-width="2" stroke-opacity="0.45">
    <line x1="256" y1="120" x2="256" y2="904" />
    <line x1="512" y1="120" x2="512" y2="904" />
    <line x1="768" y1="120" x2="768" y2="904" />
    <line x1="120" y1="256" x2="904" y2="256" />
    <line x1="120" y1="512" x2="904" y2="512" />
    <line x1="120" y1="768" x2="904" y2="768" />
  </g>
  <!-- Board frame -->
  <rect x="116" y="148" width="792" height="728" rx="76" fill="none" stroke="#475569" stroke-width="10" stroke-opacity="0.55" />
  <!-- Intersecting Physics orbits -->
  <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(32 512 512)" fill="none" stroke="url(#orbA)" stroke-width="34" stroke-linecap="round" />
  <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(-32 512 512)" fill="none" stroke="url(#orbB)" stroke-width="34" stroke-linecap="round" />
  <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(90 512 512)" fill="none" stroke="#93c5fd" stroke-width="20" stroke-opacity="0.72" />
  <!-- Vector arrow across board -->
  <line x1="312" y1="676" x2="704" y2="320" stroke="#f8fafc" stroke-width="26" stroke-linecap="round" />
  <polygon points="736,292 646,310 704,374" fill="#f8fafc" />
  <!-- Nucleus / Origin point -->
  <circle cx="512" cy="512" r="54" fill="#f59e0b" />
  <circle cx="512" cy="512" r="24" fill="#fef3c7" />
</svg>`;

const FOREGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.72) translate(-512 -512)">
    <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(32 512 512)" fill="none" stroke="#38bdf8" stroke-width="36" />
    <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(-32 512 512)" fill="none" stroke="#2dd4bf" stroke-width="36" />
    <ellipse cx="512" cy="512" rx="300" ry="120" transform="rotate(90 512 512)" fill="none" stroke="#93c5fd" stroke-width="22" stroke-opacity="0.8" />
    <line x1="312" y1="676" x2="704" y2="320" stroke="#f8fafc" stroke-width="28" stroke-linecap="round" />
    <polygon points="736,292 646,310 704,374" fill="#f8fafc" />
    <circle cx="512" cy="512" r="56" fill="#f59e0b" />
    <circle cx="512" cy="512" r="24" fill="#fef3c7" />
  </g>
</svg>`;

const BACKGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" fill="#0f172a" />
</svg>`;

async function main() {
  const assetsDir = path.join(ROOT, 'assets');
  const buildDir = path.join(ROOT, 'build');
  const publicDir = path.join(ROOT, 'public');
  const appDir = path.join(ROOT, 'src', 'app');

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  const svgBuf = Buffer.from(LOGO_SVG, 'utf-8');
  const fgBuf = Buffer.from(FOREGROUND_SVG, 'utf-8');
  const bgBuf = Buffer.from(BACKGROUND_SVG, 'utf-8');

  // 1. Master 1024x1024 logo.png + Adaptive icon layers
  await sharp(svgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'logo.png'));
  await sharp(svgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-only.png'));
  await sharp(fgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-foreground.png'));
  await sharp(bgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-background.png'));

  // 2. Web / Public icons
  await sharp(svgBuf).resize(256, 256).png().toFile(path.join(publicDir, 'logo.png'));

  // 3. Windows Electron build/icon.png (512x512) & multi-size build/icon.ico (16..256)
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(buildDir, 'icon.png'));
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngBuffers = await Promise.all(
    icoSizes.map((sz) => sharp(svgBuf).resize(sz, sz).png().toBuffer())
  );
  const winIco = await pngToIco(icoPngBuffers);
  await fs.writeFile(path.join(buildDir, 'icon.ico'), winIco);

  // 4. App favicon.ico (16, 32, 48)
  const favBuffers = await Promise.all(
    [16, 32, 48].map((sz) => sharp(svgBuf).resize(sz, sz).png().toBuffer())
  );
  const favIco = await pngToIco(favBuffers);
  await fs.writeFile(path.join(appDir, 'favicon.ico'), favIco);

  console.log('Generated PhysBoard icons: assets/logo.png (1024x1024), build/icon.ico, build/icon.png, public/logo.png, src/app/favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

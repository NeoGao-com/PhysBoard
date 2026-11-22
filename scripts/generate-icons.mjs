import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT = process.cwd();

// Modern Samsung One UI & Apple Minimalist inspired logo for PhysBoard:
// - Squircle canvas background with subtle modern gradient (#0f172a -> #0284c7)
// - Stylized letter 'P' blending with a physics orbit, coordinate axis & smart stylus pen tip
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <!-- Background Gradient: Deep Oceanic to Vibrant Galaxy Blue -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>

    <!-- Neon Glow Gradient for Primary Stroke -->
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <!-- Energetic Amber/Cyan Accent -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>

    <radialGradient id="glowPoint" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
    </radialGradient>

    <!-- Soft Drop Shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Squircle Base with smooth corners (Samsung One UI / macOS style) -->
  <rect x="32" y="32" width="960" height="960" rx="230" fill="url(#bgGrad)" />

  <!-- Subtle Math Grid Lines -->
  <g stroke="#334155" stroke-width="2.5" stroke-opacity="0.35" stroke-dasharray="8 8">
    <line x1="256" y1="140" x2="256" y2="884" />
    <line x1="512" y1="140" x2="512" y2="884" />
    <line x1="768" y1="140" x2="768" y2="884" />
    <line x1="140" y1="256" x2="884" y2="256" />
    <line x1="140" y1="512" x2="884" y2="512" />
    <line x1="140" y1="768" x2="884" y2="768" />
  </g>

  <!-- Glowing Aura Circle behind center -->
  <circle cx="512" cy="512" r="320" fill="url(#glowPoint)" />

  <!-- Outer Board Inner Bevel Border -->
  <rect x="80" y="80" width="864" height="864" rx="190" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="4" />

  <!-- Main Dynamic Symbol: Iconic Stylized 'P' + Physics Orbit + Stylus Vector -->
  <g filter="url(#shadow)">
    <!-- Physics Quantum Ellipse 1 -->
    <ellipse cx="512" cy="512" rx="340" ry="135" transform="rotate(-30 512 512)" fill="none" stroke="url(#accentGrad)" stroke-width="36" stroke-linecap="round" />
    
    <!-- Physics Quantum Ellipse 2 (Intersecting) -->
    <ellipse cx="512" cy="512" rx="340" ry="135" transform="rotate(35 512 512)" fill="none" stroke="url(#primaryGrad)" stroke-width="38" stroke-linecap="round" />

    <!-- Stylized Stem of the Letter 'P' / Pen Stylus Shaft -->
    <path d="M 390 260 L 390 770" stroke="#ffffff" stroke-width="54" stroke-linecap="round" />

    <!-- Stylized Head Loop of the Letter 'P' -->
    <path d="M 390 260 C 620 260, 680 340, 680 440 C 680 540, 600 600, 390 600" fill="none" stroke="#ffffff" stroke-width="54" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Pen Tip Sharp Nib at bottom of stem -->
    <polygon points="363,770 417,770 390,830" fill="#38bdf8" />
    <circle cx="390" cy="830" r="7" fill="#ffffff" />

    <!-- Nucleus & Particle Sparkles -->
    <circle cx="512" cy="512" r="36" fill="#f59e0b" />
    <circle cx="512" cy="512" r="16" fill="#fffbeb" />

    <!-- Orbit Satellite Particles -->
    <circle cx="750" cy="380" r="22" fill="#38bdf8" />
    <circle cx="280" cy="650" r="20" fill="#34d399" />
  </g>
</svg>`;

const FOREGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="fgPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="fgAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <g transform="translate(512 512) scale(0.74) translate(-512 -512)">
    <ellipse cx="512" cy="512" rx="340" ry="135" transform="rotate(-30 512 512)" fill="none" stroke="url(#fgAccent)" stroke-width="40" stroke-linecap="round" />
    <ellipse cx="512" cy="512" rx="340" ry="135" transform="rotate(35 512 512)" fill="none" stroke="url(#fgPrimary)" stroke-width="42" stroke-linecap="round" />
    <path d="M 390 260 L 390 770" stroke="#ffffff" stroke-width="56" stroke-linecap="round" />
    <path d="M 390 260 C 620 260, 680 340, 680 440 C 680 540, 600 600, 390 600" fill="none" stroke="#ffffff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="362,770 418,770 390,832" fill="#38bdf8" />
    <circle cx="512" cy="512" r="38" fill="#f59e0b" />
    <circle cx="512" cy="512" r="16" fill="#fffbeb" />
    <circle cx="750" cy="380" r="22" fill="#38bdf8" />
    <circle cx="280" cy="650" r="20" fill="#34d399" />
  </g>
</svg>`;

const BACKGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="androidBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" fill="url(#androidBg)" />
</svg>`;

async function main() {
  const assetsDir = path.join(ROOT, 'assets');
  const buildDir = path.join(ROOT, 'build');
  const publicDir = path.join(ROOT, 'public');
  const appDir = path.join(ROOT, 'src', 'app');

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });
  await fs.mkdir(appDir, { recursive: true });

  const svgBuf = Buffer.from(LOGO_SVG);
  const fgBuf = Buffer.from(FOREGROUND_SVG);
  const bgBuf = Buffer.from(BACKGROUND_SVG);

  console.log('Rendering modern master icons (1024x1024)...');
  await sharp(svgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'logo.png'));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(buildDir, 'icon.png'));
  await sharp(svgBuf).resize(256, 256).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(fgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-foreground.png'));
  await sharp(bgBuf).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-background.png'));

  console.log('Generating Windows multi-resolution icon.ico...');
  const pngSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    pngSizes.map((sz) => sharp(svgBuf).resize(sz, sz).png().toBuffer())
  );
  const icoBuf = await pngToIco(pngBuffers);
  await fs.writeFile(path.join(buildDir, 'icon.ico'), icoBuf);
  await fs.writeFile(path.join(appDir, 'favicon.ico'), icoBuf);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuf);

  console.log('Generating Android mipmap icons (Capacitor)...');
  const androidResDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.dir);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      await sharp(svgBuf).resize(m.size, m.size).png().toFile(path.join(targetDir, 'ic_launcher.png'));
      await sharp(svgBuf).resize(m.size, m.size).png().toFile(path.join(targetDir, 'ic_launcher_round.png'));
      await sharp(fgBuf).resize(m.fgSize, m.fgSize).png().toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
    } catch {
      // Ignore if directory does not exist
    }
  }

  console.log('✓ Hoàn tất làm mới logo cho toàn bộ nền tảng (Web, Windows .ico, Android App Icon)!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

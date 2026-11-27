import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const rootDir = path.resolve(import.meta.dirname, '..');
const distDir = path.join(rootDir, 'dist');
const STATIC_ASSETS = ['favicon.svg', 'banner.png', 'wind_logo.png'];
const ROOT_JS_FILES = ['data.js'];

/**
 * Minifies and mangles local identifiers using Terser via non-interactive npx.
 * Avoids --toplevel so HTML onclick handlers and shared globals stay intact.
 */
function hardenJs(sourceCode, label) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpIn = path.join(os.tmpdir(), `mfa-in-${stamp}.js`);
  const tmpOut = path.join(os.tmpdir(), `mfa-out-${stamp}.js`);

  try {
    fs.writeFileSync(tmpIn, sourceCode, 'utf8');
    const isWin = process.platform === 'win32';
    const terserArgs = ['-y', 'terser', tmpIn, '--compress', 'drop_debugger=true', '--mangle', '-o', tmpOut];
    const res = spawnSync(
      isWin ? 'cmd.exe' : 'npx',
      isWin ? ['/d', '/c', 'npx', ...terserArgs] : terserArgs,
      { encoding: 'utf8' }
    );
    if (res.status !== 0) {
      throw new Error(`Terser failed on ${label}: ${res.stderr || res.stdout}`);
    }
    const hardened = fs.readFileSync(tmpOut, 'utf8');
    new vm.Script(hardened, { filename: label });
    return hardened;
  } finally {
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();
}

function hardenHtml(html) {
  const preserved = [];
  const token = (content) => {
    const id = `__MFA_BLOCK_${preserved.length}__`;
    preserved.push(content);
    return id;
  };

  let out = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) =>
    token(`<style${attrs}>${minifyCss(css)}</style>`)
  );

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
    if (/\bsrc\s*=/i.test(attrs) || !body.trim()) return token(full);
    const hardened = hardenJs(body, 'inline-script.js');
    return token(`<script${attrs}>${hardened}</script>`);
  });

  out = out
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s*\r?\n\s*</g, '><')
    .trim();

  return out.replace(/__MFA_BLOCK_(\d+)__/g, (_, i) => preserved[Number(i)]);
}

function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const htmlIn = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const htmlOut = hardenHtml(htmlIn);
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlOut, 'utf8');
  console.log(`index.html: ${htmlIn.length} -> ${htmlOut.length} bytes`);

  for (const jsFile of ROOT_JS_FILES) {
    const src = path.join(rootDir, jsFile);
    if (!fs.existsSync(src)) continue;
    const raw = fs.readFileSync(src, 'utf8');
    const hardened = hardenJs(raw, jsFile);
    fs.writeFileSync(path.join(distDir, jsFile), hardened, 'utf8');
    console.log(`${jsFile}: ${raw.length} -> ${hardened.length} bytes`);
  }

  for (const asset of STATIC_ASSETS) {
    const src = path.join(rootDir, asset);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(distDir, asset));
      console.log(`copied asset: ${asset}`);
    }
  }
}

build();

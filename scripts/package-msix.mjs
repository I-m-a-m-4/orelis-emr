/**
 * Packages the built Windows binary into an MSIX for Microsoft Store submission.
 *
 * WHY MSIX AND NOT THE NSIS/MSI INSTALLER
 *
 * The Store will not accept a `.exe` or `.msi`. It takes `.msix`/`.msixbundle`,
 * and Tauri cannot emit one — so this bridges the gap: take the compiled
 * `orelis.exe`, wrap it in a package manifest that declares the Store identity,
 * and hand the result to Partner Center.
 *
 * DO NOT SIGN THE OUTPUT
 *
 * Partner Center re-signs every package with the Store's own certificate during
 * certification. A locally-signed package is not more trusted, it is just a
 * package whose signature is about to be replaced. Signing is only needed to
 * *sideload* (install without the Store), which needs a cert this repo does not
 * carry. The script deliberately has no signing step.
 *
 * IDENTITY IS NOT GUESSABLE
 *
 * `Identity/@Name` and `Identity/@Publisher` must match byte-for-byte what
 * Partner Center shows under Product identity for the reserved app name. A wrong
 * value is not rejected at pack time — it is rejected after upload, minutes into
 * certification. So they come from config and the script refuses to invent them.
 *
 * Usage:
 *   npm run tauri:build          # produces target/release/orelis.exe
 *   npm run package:msix
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC_TAURI = path.join(ROOT, 'src-tauri');
const ICONS = path.join(SRC_TAURI, 'icons');
const RELEASE = path.join(SRC_TAURI, 'target/release');
const PACK_DIR = path.join(ROOT, '.msix-pack');
const DIST = path.join(ROOT, 'dist-msix');
const CONFIG_PATH = path.join(SRC_TAURI, 'msix.config.json');

const EXE_NAME = 'Orelis.exe';

function fail(message) {
    console.error(`\n[package-msix] ${message}\n`);
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Version
//
// MSIX requires exactly four parts, and the Store additionally requires the
// fourth to be 0 (it reserves the revision field for its own rebuilds). Tauri
// carries three, so the fourth is appended rather than asked for.
// ---------------------------------------------------------------------------
function readVersion() {
    const conf = JSON.parse(fs.readFileSync(path.join(SRC_TAURI, 'tauri.conf.json'), 'utf8'));
    const v = conf.version;
    if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) {
        fail(`tauri.conf.json version is "${v}"; expected three numeric parts like 1.2.3.`);
    }
    return { three: v, four: `${v}.0` };
}

// ---------------------------------------------------------------------------
// Store identity
// ---------------------------------------------------------------------------
function readIdentity() {
    const fromEnv = {
        name: process.env.MSIX_IDENTITY_NAME,
        publisher: process.env.MSIX_PUBLISHER,
        publisherDisplayName: process.env.MSIX_PUBLISHER_DISPLAY_NAME,
    };

    let fromFile = {};
    if (fs.existsSync(CONFIG_PATH)) {
        fromFile = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }

    const identity = {
        name: fromEnv.name || fromFile.identityName,
        publisher: fromEnv.publisher || fromFile.publisher,
        publisherDisplayName:
            fromEnv.publisherDisplayName || fromFile.publisherDisplayName || 'Orelis',
        displayName: fromFile.displayName || 'Orelis',
        description: fromFile.description || 'Offline-first electronic medical records for clinics and hospitals.',
    };

    // Placeholder values must fail as loudly as missing ones. A committed config
    // full of TODOs is the most likely way a wrong identity reaches Partner
    // Center.
    const placeholder = (s) => !s || /TODO|REPLACE|XXXX|<.*>/i.test(s);

    if (placeholder(identity.name) || placeholder(identity.publisher)) {
        fail(
            `Store identity is not configured.\n\n` +
                `  In Partner Center: your app -> Product management -> Product identity.\n` +
                `  Copy "Package/Identity/Name" and "Package/Identity/Publisher" exactly.\n\n` +
                `  Then either write ${path.relative(ROOT, CONFIG_PATH)}:\n\n` +
                `    {\n` +
                `      "identityName": "12345Publisher.Orelis",\n` +
                `      "publisher": "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",\n` +
                `      "publisherDisplayName": "Your Company",\n` +
                `      "displayName": "Orelis"\n` +
                `    }\n\n` +
                `  or set MSIX_IDENTITY_NAME and MSIX_PUBLISHER in the environment (use this in CI).\n\n` +
                `  Note: Publisher is the CN=<guid> the Store assigns. It is NOT your company name,\n` +
                `  and a mismatch is only reported after upload, part-way through certification.`
        );
    }

    if (!/^CN=/i.test(identity.publisher)) {
        fail(`publisher must start with "CN=" — got "${identity.publisher}".`);
    }

    return identity;
}

// ---------------------------------------------------------------------------
// makeappx.exe
//
// Ships with the Windows SDK, in a per-SDK-version directory. Resolved by
// scanning rather than hardcoding, because the installed SDK version differs
// between this machine and any CI runner.
// ---------------------------------------------------------------------------
function findMakeAppx() {
    if (process.env.MAKEAPPX_PATH) {
        if (!fs.existsSync(process.env.MAKEAPPX_PATH)) {
            fail(`MAKEAPPX_PATH is set to "${process.env.MAKEAPPX_PATH}" but that file does not exist.`);
        }
        return process.env.MAKEAPPX_PATH;
    }

    const roots = [
        'C:\\Program Files (x86)\\Windows Kits\\10\\bin',
        'C:\\Program Files\\Windows Kits\\10\\bin',
    ].filter((p) => fs.existsSync(p));

    const candidates = [];
    for (const root of roots) {
        for (const entry of fs.readdirSync(root)) {
            // SDK version dirs look like 10.0.26100.0; arch dirs (x64/x86/arm64)
            // sit alongside them and belong to no version.
            if (!/^10\.\d+\.\d+\.\d+$/.test(entry)) continue;
            for (const arch of ['x64', 'x86']) {
                const exe = path.join(root, entry, arch, 'makeappx.exe');
                if (fs.existsSync(exe)) candidates.push({ version: entry, arch, exe });
            }
        }
    }

    if (candidates.length === 0) {
        fail(
            `makeappx.exe not found.\n\n` +
                `  Install the "Windows SDK Signing Tools" / "Windows App Certification Kit"\n` +
                `  component of the Windows 10/11 SDK, or set MAKEAPPX_PATH to its full path.`
        );
    }

    // Newest SDK, preferring x64. Compare numerically — a string sort puts
    // 10.0.9 after 10.0.26100.
    const parse = (v) => v.split('.').map(Number);
    candidates.sort((a, b) => {
        const pa = parse(a.version);
        const pb = parse(b.version);
        for (let i = 0; i < 4; i++) {
            if (pa[i] !== pb[i]) return pb[i] - pa[i];
        }
        return a.arch === 'x64' ? -1 : 1;
    });

    return candidates[0].exe;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------
function buildManifest({ identity, version }) {
    const esc = (s) =>
        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="utf-8"?>
<!--
  Generated by scripts/package-msix.mjs. Edits here are overwritten on the next
  pack; change the script or src-tauri/msix.config.json instead.
-->
<Package
    xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
    xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
    xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">

  <Identity Name="${esc(identity.name)}"
            Version="${version.four}"
            Publisher="${esc(identity.publisher)}"
            ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>${esc(identity.displayName)}</DisplayName>
    <PublisherDisplayName>${esc(identity.publisherDisplayName)}</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>

  <Resources>
    <Resource Language="en-US" />
  </Resources>

  <Dependencies>
    <!--
      MinVersion 10.0.17763 (1809) is the floor for full-trust MSIX. Hospital
      desktops are frequently old, so this is kept as low as MSIX allows rather
      than tracking current Windows.
    -->
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>

  <Capabilities>
    <!-- A Win32 binary in a package is full-trust by definition; the Store
         allows this for desktop apps and requires it to be declared. -->
    <rescap:Capability Name="runFullTrust" />

    <Capability Name="internetClient" />
    <Capability Name="privateNetworkClientServer" />

    <!--
      DEVICE CAPABILITIES ARE LOAD-BEARING FOR VOICE DICTATION.

      Windows gates microphone and camera on *package identity*, not on trust
      level. Inside an MSIX the app runs under a package identity that the
      privacy subsystem checks against these declarations, so an undeclared mic
      is denied even though runFullTrust is granted — WebView2's getUserMedia
      rejects, no prompt appears, and Settings > Privacy > Microphone does not
      list the app at all, leaving the user nothing to toggle. The unpackaged
      NSIS build has no such gate, so this failure appears *only* in the Store
      build: dictation works in testing and is dead on the shipped package.
    -->
    <DeviceCapability Name="microphone" />
    <DeviceCapability Name="webcam" />
  </Capabilities>

  <Applications>
    <Application Id="App" Executable="${EXE_NAME}" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
          DisplayName="${esc(identity.displayName)}"
          Description="${esc(identity.description)}"
          Square150x150Logo="Assets\\Square150x150Logo.png"
          Square44x44Logo="Assets\\Square44x44Logo.png"
          BackgroundColor="transparent">
        <uap:DefaultTile
            Square71x71Logo="Assets\\Square71x71Logo.png"
            Square310x310Logo="Assets\\Square310x310Logo.png"
            Wide310x150Logo="Assets\\Square310x310Logo.png" />
        <uap:SplashScreen Image="Assets\\StoreLogo.png" BackgroundColor="transparent" />
      </uap:VisualElements>
    </Application>
  </Applications>
</Package>
`;
}

// ---------------------------------------------------------------------------
function main() {
    if (process.platform !== 'win32') {
        fail('MSIX packaging requires Windows (makeappx.exe is a Windows SDK tool).');
    }

    const version = readVersion();
    const identity = readIdentity();
    const makeappx = findMakeAppx();

    // cargo names the binary after the crate (`orelis.exe`); `tauri build`
    // renames it to productName (`Orelis.exe`). Both are valid inputs, and on a
    // case-insensitive filesystem checking for one silently finds the other —
    // which would break the moment this runs on a case-sensitive CI runner. So
    // resolve explicitly, then copy to one canonical name that the manifest's
    // Executable attribute can rely on.
    const exeSrc = ['Orelis.exe', 'orelis.exe']
        .map((n) => path.join(RELEASE, n))
        .find((p) => fs.existsSync(p));

    if (!exeSrc) {
        fail(
            `No built binary in ${path.relative(ROOT, RELEASE)} (looked for Orelis.exe and orelis.exe).\n\n` +
                `  Run \`npm run tauri:build\` first. Packaging a previous build silently\n` +
                `  would ship a version number that does not match the code inside.`
        );
    }

    // Rebuild the pack dir from scratch every time. Reusing it is how a stale
    // exe gets shipped under a bumped version number.
    fs.rmSync(PACK_DIR, { recursive: true, force: true });
    fs.mkdirSync(path.join(PACK_DIR, 'Assets'), { recursive: true });
    fs.mkdirSync(DIST, { recursive: true });

    fs.copyFileSync(exeSrc, path.join(PACK_DIR, EXE_NAME));

    // The Store validates that every logo referenced by the manifest exists and
    // is a real PNG of the right size. `tauri icon` generates all of these.
    const assets = [
        'StoreLogo.png',
        'Square30x30Logo.png',
        'Square44x44Logo.png',
        'Square71x71Logo.png',
        'Square89x89Logo.png',
        'Square107x107Logo.png',
        'Square142x142Logo.png',
        'Square150x150Logo.png',
        'Square284x284Logo.png',
        'Square310x310Logo.png',
    ];
    const missingAssets = [];
    for (const asset of assets) {
        const src = path.join(ICONS, asset);
        if (!fs.existsSync(src)) {
            missingAssets.push(asset);
            continue;
        }
        fs.copyFileSync(src, path.join(PACK_DIR, 'Assets', asset));
    }
    if (missingAssets.length > 0) {
        fail(
            `Missing Store logo assets in src-tauri/icons: ${missingAssets.join(', ')}\n\n` +
                `  Regenerate with: npx tauri icon public/icon.png`
        );
    }

    fs.writeFileSync(
        path.join(PACK_DIR, 'AppxManifest.xml'),
        buildManifest({ identity, version }),
        'utf8'
    );

    const outFile = path.join(DIST, `Orelis_${version.three}_x64.msix`);
    fs.rmSync(outFile, { force: true });

    console.log(`[package-msix] makeappx: ${makeappx}`);
    console.log(`[package-msix] identity: ${identity.name} ${version.four}`);

    try {
        const out = execFileSync(
            makeappx,
            ['pack', '/d', PACK_DIR, '/p', outFile, '/o'],
            { encoding: 'utf8' }
        );
        console.log(out.trim());
    } catch (err) {
        // makeappx puts its actual diagnostics on stdout, so surfacing only the
        // exit status hides the reason.
        console.error(err.stdout?.toString() ?? '');
        console.error(err.stderr?.toString() ?? '');
        fail('makeappx failed — see output above.');
    }

    fs.rmSync(PACK_DIR, { recursive: true, force: true });

    console.log(
        `\n[package-msix] Wrote ${path.relative(ROOT, outFile)}\n\n` +
            `  Upload this file to Partner Center as-is. Do NOT sign it — Partner Center\n` +
            `  signs with the Store certificate during certification, and a local signature\n` +
            `  is simply replaced.\n\n` +
            `  Before submitting, sanity-check the package locally:\n` +
            `    Add-AppxPackage -Path "${outFile}"   # needs a trusted cert; expect it to refuse\n` +
            `  and run the Windows App Certification Kit against it if available.\n`
    );
}

main();

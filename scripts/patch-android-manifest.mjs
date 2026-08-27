/**
 * Injects the hardware permissions Orelis needs into the generated Android
 * manifest.
 *
 * WHY THIS SCRIPT EXISTS AT ALL
 *
 * `tauri android init` generates `src-tauri/gen/android/` once and that tree is
 * gitignored (it is regenerated, contains absolute paths, and churns on every
 * Tauri upgrade). So the manifest cannot simply be edited and committed — it has
 * to be re-patched on every machine and every CI run after `init`.
 *
 * WHAT BREAKS WITHOUT IT
 *
 * Android denies `getUserMedia({ audio: true })` with a bare
 * `NotAllowedError` when RECORD_AUDIO is absent from the manifest — no OS
 * prompt, no way for the user to grant it, and nothing in the JS error that
 * distinguishes it from a user declining. Voice dictation is a headline clinical
 * feature here, so the failure mode is: build succeeds, APK installs, the mic
 * button appears, and every tap fails with what looks like a permission the
 * doctor refused. Runtime `requestPermissions` cannot rescue a permission the
 * manifest never declared.
 *
 * Run after `tauri android init`, and from `beforeBuildCommand` so a forgotten
 * manual step cannot ship a mic-less build.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANDROID_ROOT = path.join(__dirname, '../src-tauri/gen/android');
const CANONICAL = path.join(ANDROID_ROOT, 'app/src/main/AndroidManifest.xml');

/**
 * Every entry is tested for independently rather than short-circuiting on "the
 * block is already there". Adding a permission later must not be skipped just
 * because an earlier one is present from a previous run.
 *
 * `match` is what we search for; it is not always the whole tag, because
 * `uses-feature` and `uses-permission` can name the same string
 * (`android.hardware.camera`) — hence the trailing quote on that one.
 */
const ENTRIES = [
    {
        match: 'android.permission.INTERNET',
        tag: '<uses-permission android:name="android.permission.INTERNET" />',
        why: 'Firestore sync and the hosted API.',
    },
    {
        match: 'android.permission.ACCESS_NETWORK_STATE',
        tag: '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
        why: 'Lets the offline queue distinguish "no network" from "server rejected".',
    },
    {
        match: 'android.permission.RECORD_AUDIO',
        tag: '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
        why: 'Voice dictation of clinical notes. Without this getUserMedia fails with no prompt.',
    },
    {
        match: 'android.permission.MODIFY_AUDIO_SETTINGS',
        tag: '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
        why: 'MediaRecorder needs it to configure the capture route on some OEM builds.',
    },
    {
        match: 'android.permission.CAMERA',
        tag: '<uses-permission android:name="android.permission.CAMERA" />',
        why: 'Wound photos, referral letters and ID capture attached to a chart.',
    },
    {
        match: 'android.permission.POST_NOTIFICATIONS',
        tag: '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
        why: 'Appointment and critical-result alerts. Required from Android 13.',
    },
    {
        match: 'android.permission.VIBRATE',
        tag: '<uses-permission android:name="android.permission.VIBRATE" />',
        why: 'Haptics on a critical-value alert, which must not rely on the ward being quiet.',
    },
    // ---------------------------------------------------------------------
    // Every uses-feature is `required="false"` on purpose.
    //
    // `required="true"` makes Play filter the app out of search results for any
    // device lacking that hardware. A tablet at a nurses' station with no camera
    // must still be able to install an EMR; it just will not offer photo
    // capture. Declaring these at all (rather than omitting them) is what keeps
    // Play from *inferring* required="true" from the permissions above.
    // ---------------------------------------------------------------------
    {
        match: 'android.hardware.microphone',
        tag: '<uses-feature android:name="android.hardware.microphone" android:required="false" />',
        why: 'Declared optional so mic-less kiosk tablets are not filtered off Play.',
    },
    {
        match: 'android.hardware.camera"',
        tag: '<uses-feature android:name="android.hardware.camera" android:required="false" />',
        why: 'Declared optional so camera-less tablets are not filtered off Play.',
    },
    {
        match: 'android.hardware.camera.autofocus',
        tag: '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
        why: 'Optional; only affects photo quality.',
    },
];

const DOMAIN = 'orelis.app';

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const before = content;

    if (!content.includes('<application')) {
        console.error(
            `CRITICAL: ${filePath} has no <application> element. This is not a valid ` +
                `Android manifest — refusing to patch rather than writing a broken file.`
        );
        process.exit(1);
    }

    const missing = ENTRIES.filter((e) => !content.includes(e.match));

    if (missing.length > 0) {
        const block = [
            '',
            '    <!-- Orelis hardware access. Injected by scripts/patch-android-manifest.mjs;',
            '         gen/android is regenerated, so edits here do not survive. -->',
            ...missing.map((e) => `    ${e.tag}`),
            '',
        ].join('\n');
        content = content.replace('<application', `${block}\n    <application`);
    }

    // App Links: lets https://orelis.app/... open in the app, and lets Android's
    // Credential Manager offer saved orelis.app passwords at the login screen.
    // autoVerify needs /.well-known/assetlinks.json served from the domain; until
    // that exists the filter is harmless (the link just opens the browser).
    if (!content.includes(`android:host="${DOMAIN}"`) && content.includes('</activity>')) {
        const filter = [
            '',
            '        <intent-filter android:autoVerify="true">',
            '            <action android:name="android.intent.action.VIEW" />',
            '            <category android:name="android.intent.category.DEFAULT" />',
            '            <category android:name="android.intent.category.BROWSABLE" />',
            `            <data android:scheme="https" android:host="${DOMAIN}" />`,
            '        </intent-filter>',
            '',
        ].join('\n');
        content = content.replace('</activity>', `${filter}\n        </activity>`);
    }

    if (content === before) {
        console.log('AndroidManifest.xml already has every Orelis entry — no change.');
        return;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${path.relative(process.cwd(), filePath)}`);
    for (const e of missing) console.log(`  + ${e.match.replace(/"$/, '')} — ${e.why}`);
}

// This runs from beforeBuildCommand, which fires for *every* target — a Windows
// or macOS build reaches here with no Android project on disk. That is not an
// error; exit quietly. Only a project that exists but whose manifest is missing
// is worth failing over, because that is the case where a silent skip ships an
// APK whose mic button can never work.
if (!fs.existsSync(ANDROID_ROOT)) {
    console.log('No src-tauri/gen/android — skipping (run `npm run tauri:android:init` first).');
    process.exit(0);
}

if (!fs.existsSync(CANONICAL)) {
    console.error(
        `CRITICAL: ${ANDROID_ROOT} exists but ${CANONICAL} does not.\n` +
            `The Android project is present, so this build would produce an APK — one with ` +
            `no RECORD_AUDIO. Failing instead of shipping that.`
    );
    process.exit(1);
}

// Deliberately does NOT walk the tree to find a manifest. Gradle writes merged
// copies under app/build/intermediates/; patching one of those succeeds, prints
// success, and is thrown away on the next build. Only the canonical source path
// is ever written.
patch(CANONICAL);

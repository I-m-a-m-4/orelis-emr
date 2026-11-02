import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/Bello Imam/Documents/orelis/src/app/admin-imamshaffy';

const replacements = [
  { regex: /\bBusinessInstance\b/g, replacement: 'Clinic' },
  { regex: /\bbusinesses\b/g, replacement: 'clinics' },
  { regex: /\bbusinessId\b/g, replacement: 'clinicId' },
  { regex: /\bbusinessName\b/g, replacement: 'clinicName' },
  { regex: /\bBusinesses\b/g, replacement: 'Clinics' },
  { regex: /\bBusinessId\b/g, replacement: 'ClinicId' },
  // Zeneva used "business" everywhere. We need to be careful with \bbusiness\b to not break imports if any, but in the admin folder it should be fine.
  { regex: /\bbusiness\b/g, replacement: 'clinic' },
  { regex: /\bBusiness\b/g, replacement: 'Clinic' }
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(dir);
console.log("Done.");

import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/Bello Imam/Documents/orelis/src/app/admin-imamshaffy';

const replacements = [
  { regex: /\bZeneva\b/g, replacement: 'Orelis' },
  { regex: /\bzeneva\b/g, replacement: 'orelis' },
  { regex: /\bStore(s?)\b/g, replacement: 'Clinic$1' },
  { regex: /\bstore(s?)\b/g, replacement: 'clinic$1' },
  { regex: /\bProduct(s?)\b/g, replacement: 'Patient$1' },
  { regex: /\bproduct(s?)\b/g, replacement: 'patient$1' },
  { regex: /\bInventory\b/g, replacement: 'EMR' },
  { regex: /\binventory\b/g, replacement: 'emr' },
  { regex: /\bSale(s?)\b/g, replacement: 'Appointment$1' },
  { regex: /\bsale(s?)\b/g, replacement: 'appointment$1' },
  { regex: /\bOrder(s?)\b/g, replacement: 'Record$1' },
  { regex: /\border(s?)\b/g, replacement: 'record$1' },
  { regex: /\bCashier(s?)\b/g, replacement: 'Doctor$1' },
  { regex: /\bcashier(s?)\b/g, replacement: 'doctor$1' }
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

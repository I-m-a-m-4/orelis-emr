import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractProductId(input) {
  // Extract 12-char Product ID from URL or string
  const match = input.match(/([a-zA-Z0-9]{12})/);
  return match ? match[1].toUpperCase() : null;
}

async function downloadScreenshots(inputUrlOrId) {
  const productId = extractProductId(inputUrlOrId);
  if (!productId) {
    console.error("Invalid Microsoft Store URL or Product ID.");
    return;
  }

  const apiUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products/${productId}?market=US&languages=en-us`;
  console.log(`Querying Display Catalog API for Product ID: ${productId}...`);

  https.get(apiUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const localizedProps = json.Product?.LocalizedProperties?.[0];
        if (!localizedProps) {
          console.error("Could not find product details in API response.");
          return;
        }

        const appName = (localizedProps.ProductTitle || productId)
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();

        const screenshots = (localizedProps.Images || [])
          .filter(img => img.ImagePurpose === 'Screenshot');

        if (screenshots.length === 0) {
          console.log("No screenshots found for this product.");
          return;
        }

        const dir = path.join(__dirname, `${appName}_screenshots`);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        console.log(`Found ${screenshots.length} screenshots. Downloading to ${dir}...`);

        screenshots.forEach((shot, index) => {
          let imgUrl = shot.Uri;
          if (imgUrl.startsWith('//')) {
            imgUrl = 'https:' + imgUrl;
          }

          const dest = path.join(dir, `screenshot_${index + 1}.jpg`);
          const file = fs.createWriteStream(dest);

          https.get(imgUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`Downloaded: screenshot_${index + 1}.jpg`);
            });
          }).on('error', (err) => {
            fs.unlink(dest, () => {});
            console.error(`Error downloading screenshot ${index + 1}: ${err.message}`);
          });
        });
      } catch (e) {
        console.error("Error parsing API response:", e);
      }
    });
  }).on('error', (err) => {
    console.error(`API Request failed: ${err.message}`);
  });
}

const targetInput = process.argv[2] || "https://apps.microsoft.com/detail/9NN8QVGJ940S?hl=en-us&gl=NG&ocid=pdpshare";
downloadScreenshots(targetInput);


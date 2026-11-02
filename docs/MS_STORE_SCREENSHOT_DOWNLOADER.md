# Microsoft Store Screenshot Downloader Tool 🖼️

This document explains how app screenshots from the **Microsoft Store** were fetched and downloaded, how initial limitations were overcome using Microsoft's official Display Catalog API, and how to use the automated Node.js downloader script for future apps.

---

## 📜 Table of Contents
1. [Overview](#overview)
2. [Initial Problem & Resolution](#initial-problem--resolution)
3. [How the Technology Works](#how-the-technology-works)
4. [Using the Downloader Script](#using-the-downloader-script)
5. [Local Download Output Location](#local-download-output-location)

---

## 🌟 Overview

When provided with a Microsoft Store product URL:
`https://apps.microsoft.com/detail/9NN8QVGJ940S` (Zoho Inventory)

The goal was to automatically fetch and download **all full-resolution screenshots** uploaded by the app developer without manual saving.

---

## ⚠️ Initial Problem & Resolution

### The Issue
- **Web Scraping Limitations:** Scraping the HTML front-end of `apps.microsoft.com` only embeds **3 initial preview screenshots** inside the page's standard DOM / JSON-LD schema.
- Requesting additional screenshots from the web page requires interactive client-side JavaScript execution.

### The Solution: Microsoft Display Catalog API
Instead of parsing web HTML, Microsoft provides a public REST endpoint via their **Display Catalog API**:
`https://displaycatalog.mp.microsoft.com/v7.0/products/{PRODUCT_ID}?market=US&languages=en-us`

By extracting the 12-character **Product ID** (`9NN8QVGJ940S`) from the URL and querying this API directly:
- We bypass web pagination and DOM rendering.
- We retrieve the complete array of **100% of uploaded full-resolution screenshots** (e.g. 10 high-res images for Zoho Inventory) along with logos and tiles.

---

## 🔬 How the Technology Works

1. **Product ID Extraction:** The script extracts the 12-character alphanumeric ID (`9NN8QVGJ940S`) from any given Microsoft Store web link using a Regex pattern.
2. **API Query:** Sends an HTTP `GET` request to `displaycatalog.mp.microsoft.com`.
3. **Filtering Media:** Filters `Product.LocalizedProperties[0].Images` specifically for objects where `ImagePurpose === 'Screenshot'`.
4. **Automated Download:** Iterates over each screenshot URL, creates a clean output folder named after the app, and streams each image to disk as `screenshot_1.jpg`, `screenshot_2.jpg`, etc.

---

## 🛠️ Using the Downloader Script

A reusable Node.js tool script is created at:
[`download_ms_store_screenshots.mjs`](file:///c:/Users/Bello%20Imam/Documents/orelis/scripts/download_ms_store_screenshots.mjs)

### Usage Instructions

Open your terminal in the workspace directory and execute:

```bash
node ./scripts/download_ms_store_screenshots.mjs "https://apps.microsoft.com/detail/<PRODUCT_ID>"
```

#### Examples:
```bash
# Using a full URL:
node ./scripts/download_ms_store_screenshots.mjs "https://apps.microsoft.com/detail/9NN8QVGJ940S?hl=en-us&gl=NG"

# Or just using the Product ID directly:
node ./scripts/download_ms_store_screenshots.mjs "9NN8QVGJ940S"
```

---

## 📁 Local Download Output Location

For the **Zoho Inventory** app, all 10 full-resolution screenshots are saved at:
[`downloads/zoho_inventory_screenshots/`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/)

- [`screenshot_1.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_1.jpg)
- [`screenshot_2.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_2.jpg)
- [`screenshot_3.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_3.jpg)
- [`screenshot_4.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_4.jpg)
- [`screenshot_5.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_5.jpg)
- [`screenshot_6.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_6.jpg)
- [`screenshot_7.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_7.jpg)
- [`screenshot_8.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_8.jpg)
- [`screenshot_9.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_9.jpg)
- [`screenshot_10.jpg`](file:///c:/Users/Bello%20Imam/Documents/orelis/downloads/zoho_inventory_screenshots/screenshot_10.jpg)

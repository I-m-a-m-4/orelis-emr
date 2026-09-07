require('dotenv').config();
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase environment variables in .env.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
}

const db = admin.firestore();
const targetEmail = 'hamidahdejih2@gmail.com';

async function seedInventory() {
  console.log(`\n========================================`);
  console.log(`Seeding Medical Supplies Inventory for: ${targetEmail}`);
  console.log(`========================================\n`);

  // 1. Find user
  const userSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
  if (userSnap.empty) {
    console.error(`User with email ${targetEmail} not found!`);
    process.exit(1);
  }

  const userDoc = userSnap.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;
  const clinicId = userData.clinicId || uid;

  console.log(`User found: UID=${uid}, ClinicId=${clinicId}`);

  // 2. Clear old inventory for a fresh, clean screenshot layout
  const oldSnap = await db.collection('inventory').where('clinicId', '==', clinicId).get();
  console.log(`Clearing ${oldSnap.size} existing inventory documents...`);
  for (const doc of oldSnap.docs) {
    await doc.ref.delete();
  }

  // 3. Rich inventory list
  const supplies = [
    {
      name: "Adhesive Surgical Dressing Strips (Waterproof)",
      category: "Dressings",
      quantity: 55,
      unit: "boxes (50s)",
      minStock: 15
    },
    {
      name: "Aneroid Sphygmomanometer with Adult Cuff",
      category: "Instruments",
      quantity: 8,
      unit: "units",
      minStock: 3
    },
    {
      name: "Autoclave Sterilisation Indicator Tape (19mm)",
      category: "Sterilisation",
      quantity: 22,
      unit: "rolls",
      minStock: 6
    },
    {
      name: "Blood Collection Vacuum Tubes (EDTA K2)",
      category: "Diagnostics",
      quantity: 7, // Low stock (minStock: 10)
      unit: "racks (100s)",
      minStock: 10
    },
    {
      name: "Blood Glucose Test Strips (Accu-Chek)",
      category: "Diagnostics",
      quantity: 28,
      unit: "vials (50s)",
      minStock: 8
    },
    {
      name: "Digital Infrared Forehead Thermometer",
      category: "Instruments",
      quantity: 12,
      unit: "units",
      minStock: 4
    },
    {
      name: "Disposable Fluid-Resistant Surgical Gowns",
      category: "PPE",
      quantity: 25,
      unit: "packs (10s)",
      minStock: 10
    },
    {
      name: "Elastic Crepe Bandages (7.5cm x 4.5m)",
      category: "Dressings",
      quantity: 40,
      unit: "rolls",
      minStock: 10
    },
    {
      name: "Glutaraldehyde 2% Cold Sterilising Solution",
      category: "Sterilisation",
      quantity: 14,
      unit: "bottles (5L)",
      minStock: 5
    },
    {
      name: "Intravenous Cannula / Catheter 20G (Pink)",
      category: "Consumables",
      quantity: 42,
      unit: "boxes (50s)",
      minStock: 15
    },
    {
      name: "Intravenous Infusion Administration Sets",
      category: "Consumables",
      quantity: 95,
      unit: "packs",
      minStock: 20
    },
    {
      name: "N95 Particulate Respirator Masks",
      category: "PPE",
      quantity: 8, // Low stock (minStock: 10)
      unit: "boxes (20s)",
      minStock: 10
    },
    {
      name: "Nitrile Examination Gloves (Large)",
      category: "PPE",
      quantity: 60,
      unit: "boxes (100s)",
      minStock: 15
    },
    {
      name: "Nitrile Examination Gloves (Medium)",
      category: "PPE",
      quantity: 85,
      unit: "boxes (100s)",
      minStock: 20
    },
    {
      name: "Rapid Diagnostic Malaria Test Kits (Pf/Pv)",
      category: "Diagnostics",
      quantity: 35,
      unit: "kits (25s)",
      minStock: 10
    },
    {
      name: "Stainless Steel Minor Surgery Instrument Set",
      category: "Instruments",
      quantity: 6,
      unit: "sets",
      minStock: 2
    },
    {
      name: "Sterile Disposable Syringes with Needle (2ml)",
      category: "Consumables",
      quantity: 120,
      unit: "boxes (100s)",
      minStock: 25
    },
    {
      name: "Sterile Disposable Syringes with Needle (5ml)",
      category: "Consumables",
      quantity: 150,
      unit: "boxes (100s)",
      minStock: 30
    },
    {
      name: "Sterile Gauze Swabs 10cm x 10cm (8-ply)",
      category: "Dressings",
      quantity: 75,
      unit: "packs (100s)",
      minStock: 20
    },
    {
      name: "Sterile Laparotomy Drape Sheets",
      category: "Consumables",
      quantity: 0, // Out of stock (0)
      unit: "packs (5s)",
      minStock: 5
    },
    {
      name: "Urine Multi-Parameter Reagent Strips (10SG)",
      category: "Diagnostics",
      quantity: 16,
      unit: "bottles (100s)",
      minStock: 5
    }
  ];

  console.log(`--- Seeding ${supplies.length} Medical Supplies ---`);
  for (let i = 0; i < supplies.length; i++) {
    const item = supplies[i];
    const itemId = `inv-${clinicId}-${i + 1}`;
    const now = new Date().toISOString();

    await db.collection('inventory').doc(itemId).set({
      id: itemId,
      clinicId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minStock: item.minStock,
      createdAt: now,
      updatedAt: now,
    });

    const statusBadge = item.quantity === 0
      ? '[OUT OF STOCK]'
      : item.quantity <= item.minStock
        ? '[LOW STOCK]'
        : '[IN STOCK]';

    console.log(`  ✓ ${statusBadge.padEnd(14)} ${item.name} (${item.quantity} ${item.unit}, Category: ${item.category})`);
  }

  // 4. Verify composite index / ordering
  console.log(`\nVerifying Inventory collection query...`);
  const verifySnap = await db.collection('inventory')
    .where('clinicId', '==', clinicId)
    .orderBy('name', 'asc')
    .get();

  console.log(`✓ Successfully queried ${verifySnap.size} items sorted alphabetically by name.`);

  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS! INVENTORY PAGE DATA POPULATED!`);
  console.log(`Target: ${targetEmail} (${clinicId})`);
  console.log(`- 21 Medical Supply items populated`);
  console.log(`- High diversity across PPE, Consumables, Diagnostics, Dressings, Instruments & Sterilisation`);
  console.log(`- 18 In-Stock items, 2 Low-Stock alerts (amber), 1 Out-of-Stock alert (red)`);
  console.log(`========================================\n`);
}

seedInventory().then(() => process.exit(0)).catch(err => {
  console.error("Seeding Inventory Error:", err);
  process.exit(1);
});

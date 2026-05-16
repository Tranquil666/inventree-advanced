import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Users
  const adminHash = await bcrypt.hash('admin123', 10)
  const viewerHash = await bcrypt.hash('viewer123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventrtrack.com' },
    update: {},
    create: {
      email: 'admin@inventrtrack.com',
      name: 'Admin User',
      passwordHash: adminHash,
      role: 'admin',
    },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@inventrtrack.com' },
    update: {},
    create: {
      email: 'viewer@inventrtrack.com',
      name: 'Viewer User',
      passwordHash: viewerHash,
      role: 'viewer',
    },
  })

  console.log('Created users:', admin.email, viewer.email)

  // Categories
  const catElectronics = await prisma.category.create({
    data: { name: 'Electronics', description: 'Electronic components and modules' },
  })
  const catMechanical = await prisma.category.create({
    data: { name: 'Mechanical Parts', description: 'Nuts, bolts, brackets and hardware' },
  })
  const catPCBs = await prisma.category.create({
    data: { name: 'PCBs', description: 'Printed circuit boards' },
  })
  const catConnectors = await prisma.category.create({
    data: { name: 'Connectors', description: 'Electrical connectors and terminals' },
  })
  const catFasteners = await prisma.category.create({
    data: { name: 'Fasteners', description: 'Screws, bolts, nuts and washers' },
  })
  const catSensors = await prisma.category.create({
    data: { name: 'Sensors', description: 'Environmental and motion sensors' },
  })
  const catPowerSupply = await prisma.category.create({
    data: { name: 'Power Supply', description: 'Power supplies and voltage regulators' },
  })
  const catTools = await prisma.category.create({
    data: { name: 'Tools', description: 'Hand tools and equipment' },
  })

  // Sub-categories under Electronics
  const catActive = await prisma.category.create({
    data: { name: 'Active Components', description: 'ICs, transistors, diodes', parentId: catElectronics.id },
  })
  const catPassive = await prisma.category.create({
    data: { name: 'Passive Components', description: 'Resistors, capacitors, inductors', parentId: catElectronics.id },
  })

  console.log('Created categories')

  // Locations
  const locMain = await prisma.location.create({
    data: { name: 'Main Warehouse', description: 'Primary storage facility' },
  })
  const locShelfA1 = await prisma.location.create({
    data: { name: 'Shelf A-1', description: 'Row A, Shelf 1', parentId: locMain.id },
  })
  const locShelfA2 = await prisma.location.create({
    data: { name: 'Shelf A-2', description: 'Row A, Shelf 2', parentId: locMain.id },
  })
  const locShelfB1 = await prisma.location.create({
    data: { name: 'Shelf B-1', description: 'Row B, Shelf 1', parentId: locMain.id },
  })
  const locCold = await prisma.location.create({
    data: { name: 'Cold Storage', description: 'Temperature controlled storage' },
  })

  console.log('Created locations')

  // Parts
  const parts = await Promise.all([
    prisma.part.create({ data: { name: 'Arduino Uno R3', description: 'ATmega328P microcontroller board', categoryId: catActive.id, unit: 'pcs', minStock: 5 } }),
    prisma.part.create({ data: { name: 'Raspberry Pi 4 Model B 4GB', description: 'Single board computer 4GB RAM', categoryId: catActive.id, unit: 'pcs', minStock: 3 } }),
    prisma.part.create({ data: { name: 'ESP32 Dev Module', description: 'WiFi+BT microcontroller module', categoryId: catActive.id, unit: 'pcs', minStock: 10 } }),
    prisma.part.create({ data: { name: 'ATmega328P-AU', description: 'AVR 8-bit microcontroller SMD', categoryId: catActive.id, unit: 'pcs', minStock: 20 } }),
    prisma.part.create({ data: { name: '100Ω Resistor 1/4W', description: '100 ohm through-hole resistor', categoryId: catPassive.id, unit: 'pcs', minStock: 100 } }),
    prisma.part.create({ data: { name: '10kΩ Resistor 1/4W', description: '10k ohm through-hole resistor', categoryId: catPassive.id, unit: 'pcs', minStock: 100 } }),
    prisma.part.create({ data: { name: '100nF Capacitor', description: '100nF ceramic capacitor 0603', categoryId: catPassive.id, unit: 'pcs', minStock: 200 } }),
    prisma.part.create({ data: { name: '10µF Electrolytic Cap', description: '10uF 25V electrolytic capacitor', categoryId: catPassive.id, unit: 'pcs', minStock: 50 } }),
    prisma.part.create({ data: { name: 'LED Red 5mm', description: 'Red through-hole LED 5mm', categoryId: catActive.id, unit: 'pcs', minStock: 50 } }),
    prisma.part.create({ data: { name: 'LED Green 5mm', description: 'Green through-hole LED 5mm', categoryId: catActive.id, unit: 'pcs', minStock: 50 } }),
    prisma.part.create({ data: { name: 'Temperature Sensor DHT22', description: 'Digital humidity and temperature sensor', categoryId: catSensors.id, unit: 'pcs', minStock: 5 } }),
    prisma.part.create({ data: { name: 'PIR Motion Sensor HC-SR501', description: 'Passive infrared motion detector', categoryId: catSensors.id, unit: 'pcs', minStock: 3 } }),
    prisma.part.create({ data: { name: 'Ultrasonic Sensor HC-SR04', description: 'Distance sensor 2cm-400cm', categoryId: catSensors.id, unit: 'pcs', minStock: 5 } }),
    prisma.part.create({ data: { name: 'USB-C Connector', description: 'USB Type-C right angle connector', categoryId: catConnectors.id, unit: 'pcs', minStock: 20 } }),
    prisma.part.create({ data: { name: 'JST-XH 2-pin Connector', description: '2.54mm pitch 2-pin JST connector', categoryId: catConnectors.id, unit: 'pcs', minStock: 50 } }),
    prisma.part.create({ data: { name: '40-pin Header Strip', description: '2.54mm single row male header', categoryId: catConnectors.id, unit: 'pcs', minStock: 30 } }),
    prisma.part.create({ data: { name: 'M3x8mm Bolt', description: 'M3 stainless steel hex bolt 8mm', categoryId: catFasteners.id, unit: 'pcs', minStock: 100 } }),
    prisma.part.create({ data: { name: 'M3 Nut', description: 'M3 stainless steel hex nut', categoryId: catFasteners.id, unit: 'pcs', minStock: 100 } }),
    prisma.part.create({ data: { name: 'M3 Washer', description: 'M3 stainless steel flat washer', categoryId: catFasteners.id, unit: 'pcs', minStock: 200 } }),
    prisma.part.create({ data: { name: '5V 3A USB-C Power Supply', description: '5V regulated switching power supply', categoryId: catPowerSupply.id, unit: 'pcs', minStock: 5 } }),
    prisma.part.create({ data: { name: 'LM7805 Voltage Regulator', description: '5V 1A linear voltage regulator TO-220', categoryId: catPowerSupply.id, unit: 'pcs', minStock: 20 } }),
    prisma.part.create({ data: { name: 'Arduino Shield PCB (blank)', description: 'Custom shield PCB for Arduino Uno', categoryId: catPCBs.id, unit: 'pcs', minStock: 10 } }),
    prisma.part.create({ data: { name: 'Sensor Board PCB', description: 'Custom sensor breakout PCB', categoryId: catPCBs.id, unit: 'pcs', minStock: 5 } }),
    prisma.part.create({ data: { name: 'Soldering Iron 60W', description: '60W adjustable temperature soldering iron', categoryId: catTools.id, unit: 'pcs', minStock: 1 } }),
    prisma.part.create({ data: { name: 'Wire Stripper', description: 'Adjustable wire stripper tool', categoryId: catTools.id, unit: 'pcs', minStock: 1 } }),
    prisma.part.create({ data: { name: 'NPN Transistor 2N2222', description: 'NPN general purpose transistor TO-92', categoryId: catActive.id, unit: 'pcs', minStock: 30 } }),
    prisma.part.create({ data: { name: '1N4007 Diode', description: '1A 1000V rectifier diode', categoryId: catActive.id, unit: 'pcs', minStock: 50 } }),
    prisma.part.create({ data: { name: '16MHz Crystal Oscillator', description: '16MHz HC-49S crystal', categoryId: catPassive.id, unit: 'pcs', minStock: 20 } }),
    prisma.part.create({ data: { name: 'Piezo Buzzer 5V', description: 'Active piezo buzzer 5V', categoryId: catActive.id, unit: 'pcs', minStock: 10 } }),
    prisma.part.create({ data: { name: 'OLED Display 128x64', description: '0.96" I2C OLED display module', categoryId: catElectronics.id, unit: 'pcs', minStock: 5 } }),
  ])

  console.log(`Created ${parts.length} parts`)

  const [arduino, rpi, esp32, atmega, r100, r10k, c100n, c10u, ledRed, ledGreen, dht22, pir, hcsr04, usbC, jst2, header40, m3bolt, m3nut, m3washer, psu5v, lm7805, arduinoShield, sensorPcb, sIron, wStrip, npn2222, d1n4007, xtal16, buzzer, oled] = parts

  // Stock Items
  const stockData = [
    { partId: arduino.id, locationId: locShelfA1.id, quantity: 12, batchCode: 'BATCH-ARD-001' },
    { partId: rpi.id, locationId: locShelfA1.id, quantity: 6, batchCode: 'BATCH-RPI-001' },
    { partId: esp32.id, locationId: locShelfA1.id, quantity: 25, batchCode: 'BATCH-ESP-001' },
    { partId: atmega.id, locationId: locShelfA2.id, quantity: 45 },
    { partId: r100.id, locationId: locShelfA2.id, quantity: 450 },
    { partId: r10k.id, locationId: locShelfA2.id, quantity: 380 },
    { partId: c100n.id, locationId: locShelfA2.id, quantity: 620 },
    { partId: c10u.id, locationId: locShelfA2.id, quantity: 180 },
    { partId: ledRed.id, locationId: locShelfB1.id, quantity: 200 },
    { partId: ledGreen.id, locationId: locShelfB1.id, quantity: 150 },
    { partId: dht22.id, locationId: locShelfB1.id, quantity: 8 },
    { partId: pir.id, locationId: locShelfB1.id, quantity: 4 },
    { partId: hcsr04.id, locationId: locShelfB1.id, quantity: 12 },
    { partId: usbC.id, locationId: locShelfA2.id, quantity: 60 },
    { partId: jst2.id, locationId: locShelfA2.id, quantity: 120 },
    { partId: header40.id, locationId: locShelfA2.id, quantity: 75 },
    { partId: m3bolt.id, locationId: locMain.id, quantity: 350 },
    { partId: m3nut.id, locationId: locMain.id, quantity: 420 },
    { partId: m3washer.id, locationId: locMain.id, quantity: 580 },
    { partId: psu5v.id, locationId: locShelfA1.id, quantity: 3 },
    { partId: lm7805.id, locationId: locShelfA2.id, quantity: 55 },
    { partId: arduinoShield.id, locationId: locShelfB1.id, quantity: 8 },
    { partId: sensorPcb.id, locationId: locShelfB1.id, quantity: 3 },
    { partId: sIron.id, locationId: locMain.id, quantity: 2 },
    { partId: wStrip.id, locationId: locMain.id, quantity: 3 },
    { partId: npn2222.id, locationId: locShelfA2.id, quantity: 85 },
    { partId: d1n4007.id, locationId: locShelfA2.id, quantity: 130 },
    { partId: xtal16.id, locationId: locShelfA2.id, quantity: 40 },
    { partId: buzzer.id, locationId: locShelfB1.id, quantity: 22 },
    { partId: oled.id, locationId: locShelfA1.id, quantity: 7 },
  ]

  const stockItems = await Promise.all(
    stockData.map((d) => prisma.stockItem.create({ data: d }))
  )

  // Stock history for initial adds
  await Promise.all(
    stockItems.map((si) =>
      prisma.stockHistory.create({
        data: {
          stockItemId: si.id,
          partId: si.partId,
          type: 'ADD',
          quantity: si.quantity,
          notes: 'Initial stock entry',
          userId: admin.id,
        },
      })
    )
  )

  console.log('Created stock items and history')

  // Suppliers
  const [supDigikey, supMouser, supRS, supAmazon, supSparkfun] = await Promise.all([
    prisma.supplier.create({ data: { name: 'Digi-Key Electronics', email: 'orders@digikey.com', phone: '+1-218-681-6674', website: 'https://www.digikey.com', address: '701 Brooks Ave S, Thief River Falls, MN 56701' } }),
    prisma.supplier.create({ data: { name: 'Mouser Electronics', email: 'sales@mouser.com', phone: '+1-800-346-6873', website: 'https://www.mouser.com', address: '1000 N Main St, Mansfield, TX 76063' } }),
    prisma.supplier.create({ data: { name: 'RS Components', email: 'cs.uk@rs-components.com', phone: '+44-1536-444-144', website: 'https://uk.rs-online.com', address: 'Birchington Road, Corby, Northants, NN17 9RS' } }),
    prisma.supplier.create({ data: { name: 'Amazon Business', email: 'business@amazon.com', website: 'https://www.amazon.com' } }),
    prisma.supplier.create({ data: { name: 'SparkFun Electronics', email: 'sales@sparkfun.com', phone: '+1-303-284-0979', website: 'https://www.sparkfun.com', address: '6333 Dry Creek Pkwy, Niwot, CO 80503' } }),
  ])

  // Supplier Parts
  await Promise.all([
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: arduino.id, sku: 'DEV-11021', price: 23.95, leadDays: 3 } }),
    prisma.supplierPart.create({ data: { supplierId: supSparkfun.id, partId: arduino.id, sku: 'DEV-11021-SF', price: 24.95, leadDays: 5 } }),
    prisma.supplierPart.create({ data: { supplierId: supAmazon.id, partId: rpi.id, sku: 'B07TC2BK1X', price: 55.00, leadDays: 2 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: esp32.id, sku: '1965-1001-ND', price: 4.50, leadDays: 5 } }),
    prisma.supplierPart.create({ data: { supplierId: supMouser.id, partId: atmega.id, sku: '556-ATMEGA328P-AU', price: 2.20, leadDays: 7 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: r100.id, sku: 'CF14JT100RCT-ND', price: 0.10, leadDays: 2, packSize: 100 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: r10k.id, sku: 'CF14JT10K0CT-ND', price: 0.10, leadDays: 2, packSize: 100 } }),
    prisma.supplierPart.create({ data: { supplierId: supMouser.id, partId: c100n.id, sku: '77-VJ0603Y104JXACW1BC', price: 0.05, leadDays: 5, packSize: 100 } }),
    prisma.supplierPart.create({ data: { supplierId: supRS.id, partId: ledRed.id, sku: '228-5981', price: 0.15, leadDays: 3, packSize: 10 } }),
    prisma.supplierPart.create({ data: { supplierId: supRS.id, partId: ledGreen.id, sku: '228-5982', price: 0.15, leadDays: 3, packSize: 10 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: dht22.id, sku: '1528-1358-ND', price: 9.95, leadDays: 5 } }),
    prisma.supplierPart.create({ data: { supplierId: supAmazon.id, partId: pir.id, sku: 'B07KZMKD31', price: 3.50, leadDays: 2 } }),
    prisma.supplierPart.create({ data: { supplierId: supSparkfun.id, partId: hcsr04.id, sku: 'SEN-15569', price: 3.95, leadDays: 3 } }),
    prisma.supplierPart.create({ data: { supplierId: supMouser.id, partId: usbC.id, sku: '649-10118193-0001LF', price: 0.85, leadDays: 7 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: m3bolt.id, sku: 'HW-M3-8-ND', price: 0.05, leadDays: 2, packSize: 100 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: lm7805.id, sku: 'MC7805CTGOS-ND', price: 0.52, leadDays: 5 } }),
    prisma.supplierPart.create({ data: { supplierId: supMouser.id, partId: npn2222.id, sku: '610-2N2222', price: 0.20, leadDays: 3 } }),
    prisma.supplierPart.create({ data: { supplierId: supDigikey.id, partId: d1n4007.id, sku: '1N4007FSCT-ND', price: 0.08, leadDays: 2, packSize: 10 } }),
    prisma.supplierPart.create({ data: { supplierId: supRS.id, partId: xtal16.id, sku: '538-2513', price: 0.45, leadDays: 5 } }),
    prisma.supplierPart.create({ data: { supplierId: supAmazon.id, partId: oled.id, sku: 'B01L9GC470', price: 6.99, leadDays: 3 } }),
  ])

  console.log('Created suppliers and supplier parts')

  // Purchase Orders
  const po1 = await prisma.purchaseOrder.create({
    data: {
      supplierId: supDigikey.id,
      reference: 'PO-2024-001',
      status: 'draft',
      notes: 'Restocking order for Q1',
      lineItems: {
        create: [
          { partId: arduino.id, quantity: 20, unitPrice: 23.95 },
          { partId: esp32.id, quantity: 50, unitPrice: 4.50 },
          { partId: r100.id, quantity: 1000, unitPrice: 0.10 },
          { partId: r10k.id, quantity: 1000, unitPrice: 0.10 },
          { partId: usbC.id, quantity: 100, unitPrice: 0.85 },
        ],
      },
    },
  })

  const po2 = await prisma.purchaseOrder.create({
    data: {
      supplierId: supMouser.id,
      reference: 'PO-2024-002',
      status: 'placed',
      notes: 'Passive components restock',
      lineItems: {
        create: [
          { partId: atmega.id, quantity: 100, unitPrice: 2.20 },
          { partId: c100n.id, quantity: 500, unitPrice: 0.05 },
          { partId: npn2222.id, quantity: 200, unitPrice: 0.20 },
          { partId: d1n4007.id, quantity: 300, unitPrice: 0.08 },
        ],
      },
    },
  })

  const po3 = await prisma.purchaseOrder.create({
    data: {
      supplierId: supAmazon.id,
      reference: 'PO-2024-003',
      status: 'complete',
      notes: 'Sensor modules order - completed',
      lineItems: {
        create: [
          { partId: rpi.id, quantity: 5, unitPrice: 55.00, received: 5 },
          { partId: dht22.id, quantity: 10, unitPrice: 9.95, received: 10 },
          { partId: oled.id, quantity: 10, unitPrice: 6.99, received: 10 },
        ],
      },
    },
  })

  console.log('Created purchase orders')

  // BOMs
  // Arduino Shield requires: Arduino Shield PCB + headers + resistors + capacitors + USB-C
  await Promise.all([
    prisma.bOMItem.create({ data: { partId: arduinoShield.id, componentId: arduinoShield.id === sensorPcb.id ? sensorPcb.id : header40.id, quantity: 2, notes: '40-pin headers' } }),
    prisma.bOMItem.create({ data: { partId: arduinoShield.id, componentId: r10k.id, quantity: 4, notes: 'Pull-up resistors' } }),
    prisma.bOMItem.create({ data: { partId: arduinoShield.id, componentId: c100n.id, quantity: 6, notes: 'Decoupling caps' } }),
    prisma.bOMItem.create({ data: { partId: arduinoShield.id, componentId: usbC.id, quantity: 1, notes: 'Power input' } }),
    prisma.bOMItem.create({ data: { partId: arduinoShield.id, componentId: ledRed.id, quantity: 1, notes: 'Power LED' } }),
  ])

  // Sensor Board requires: PCB + DHT22 + resistors + capacitors + JST connector
  await Promise.all([
    prisma.bOMItem.create({ data: { partId: sensorPcb.id, componentId: dht22.id, quantity: 1, notes: 'Temp/humidity sensor' } }),
    prisma.bOMItem.create({ data: { partId: sensorPcb.id, componentId: r10k.id, quantity: 2, notes: 'Pull-up resistors' } }),
    prisma.bOMItem.create({ data: { partId: sensorPcb.id, componentId: c100n.id, quantity: 3, notes: 'Filter capacitors' } }),
    prisma.bOMItem.create({ data: { partId: sensorPcb.id, componentId: jst2.id, quantity: 2, notes: 'Power and data connectors' } }),
    prisma.bOMItem.create({ data: { partId: sensorPcb.id, componentId: ledGreen.id, quantity: 1, notes: 'Status LED' } }),
  ])

  // ESP32 basic module BOM
  await Promise.all([
    prisma.bOMItem.create({ data: { partId: esp32.id, componentId: c100n.id, quantity: 4, notes: 'Bypass capacitors' } }),
    prisma.bOMItem.create({ data: { partId: esp32.id, componentId: usbC.id, quantity: 1, notes: 'USB interface' } }),
    prisma.bOMItem.create({ data: { partId: esp32.id, componentId: r100.id, quantity: 2, notes: 'Current limit resistors' } }),
  ])

  // LM7805 circuit
  await Promise.all([
    prisma.bOMItem.create({ data: { partId: lm7805.id, componentId: c10u.id, quantity: 2, notes: 'Input/output caps' } }),
    prisma.bOMItem.create({ data: { partId: lm7805.id, componentId: c100n.id, quantity: 2, notes: 'Bypass capacitors' } }),
    prisma.bOMItem.create({ data: { partId: lm7805.id, componentId: d1n4007.id, quantity: 1, notes: 'Protection diode' } }),
  ])

  // Arduino basic circuit BOM
  await Promise.all([
    prisma.bOMItem.create({ data: { partId: arduino.id, componentId: atmega.id, quantity: 1, notes: 'Main MCU' } }),
    prisma.bOMItem.create({ data: { partId: arduino.id, componentId: xtal16.id, quantity: 1, notes: '16MHz crystal' } }),
    prisma.bOMItem.create({ data: { partId: arduino.id, componentId: c100n.id, quantity: 4, notes: 'Decoupling caps' } }),
    prisma.bOMItem.create({ data: { partId: arduino.id, componentId: r100.id, quantity: 3, notes: 'Various resistors' } }),
    prisma.bOMItem.create({ data: { partId: arduino.id, componentId: ledRed.id, quantity: 1, notes: 'Power indicator' } }),
  ])

  console.log('Created BOMs')

  // Build Orders
  const stockArduinoShield = stockItems.find((s) => s.partId === arduinoShield.id)!
  const stockHeader40 = stockItems.find((s) => s.partId === header40.id)!
  const stockR10k = stockItems.find((s) => s.partId === r10k.id)!
  const stockC100n = stockItems.find((s) => s.partId === c100n.id)!

  const build1 = await prisma.buildOrder.create({
    data: {
      partId: arduinoShield.id,
      quantity: 5,
      status: 'pending',
      reference: 'BO-2024-001',
      notes: 'Build 5 Arduino shields for dev team',
    },
  })

  const build2 = await prisma.buildOrder.create({
    data: {
      partId: sensorPcb.id,
      quantity: 3,
      status: 'in_progress',
      reference: 'BO-2024-002',
      notes: 'Sensor boards for IoT project',
      allocations: {
        create: [
          { stockItemId: stockItems.find((s) => s.partId === dht22.id)!.id, quantity: 3 },
          { stockItemId: stockR10k.id, quantity: 6 },
          { stockItemId: stockC100n.id, quantity: 9 },
        ],
      },
    },
  })

  console.log('Created build orders')
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

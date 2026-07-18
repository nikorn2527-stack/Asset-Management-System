import { db } from '../src/lib/db';

async function seed() {
  // Create categories
  const categories = await Promise.all([
    db.assetCategory.create({ data: { name: 'คอมพิวเตอร์และอุปกรณ์', description: 'อุปกรณ์คอมพิวเตอร์ โน๊ตบุ๊ค และอุปกรณ์ต่อพ่วง' } }),
    db.assetCategory.create({ data: { name: 'เครื่องเขียนและวัสดุสำนักงาน', description: 'เครื่องเขียน กระดาษ และวัสดุสำนักงานทั่วไป' } }),
    db.assetCategory.create({ data: { name: 'เฟอร์นิเจอร์', description: 'โต๊ะ เก้าอี้ ตู้เก็บเอกสาร' } }),
    db.assetCategory.create({ data: { name: 'เครื่องใช้ไฟฟ้า', description: 'เครื่องปรับอากาศ พัดลม เครื่องถ่ายเอกสาร' } }),
    db.assetCategory.create({ data: { name: 'ยานพาหนะ', description: 'รถยนต์ รถจักรยานยนต์' } }),
    db.assetCategory.create({ data: { name: 'อุปกรณ์เครือข่าย', description: 'เราเตอร์ สวิตช์ แอคเซสพอยต์' } }),
  ]);

  // Create users
  const admin = await db.user.create({
    data: { email: 'admin@asset.go.th', name: 'สมชาย ใจดี', role: 'ADMIN', department: 'ฝ่ายบริหาร', phone: '02-123-4567' }
  });
  const staff1 = await db.user.create({
    data: { email: 'staff1@asset.go.th', name: 'วิภาดา รักงาน', role: 'STAFF', department: 'ฝ่ายพัสดุ', phone: '02-123-4568' }
  });
  const staff2 = await db.user.create({
    data: { email: 'staff2@asset.go.th', name: 'ประยุทธ์ ทำดี', role: 'STAFF', department: 'ฝ่ายพัสดุ', phone: '02-123-4569' }
  });
  const user1 = await db.user.create({
    data: { email: 'user1@asset.go.th', name: 'สุภาพร สุขใจ', role: 'USER', department: 'ฝ่ายบัญชี', phone: '02-123-4570' }
  });
  const user2 = await db.user.create({
    data: { email: 'user2@asset.go.th', name: 'ธนกร มั่งมี', role: 'USER', department: 'ฝ่ายบุคคล', phone: '02-123-4571' }
  });
  const user3 = await db.user.create({
    data: { email: 'user3@asset.go.th', name: 'จิตรา รุ่งเรือง', role: 'USER', department: 'ฝ่ายวิจัย', phone: '02-123-4572' }
  });

  // Create assets with realistic data
  const now = new Date();
  const assets = [
    // Computers
    { name: 'โน๊ตบุ๊ค Dell Latitude 5540', catId: categories[0].id, price: 35000, salvage: 3500, years: 5, date: new Date('2023-01-15'), location: 'ชั้น 2 ห้องคอมพิวเตอร์' },
    { name: 'โน๊ตบุ๊ค HP ProBook 450 G9', catId: categories[0].id, price: 32000, salvage: 3200, years: 5, date: new Date('2023-03-20'), location: 'ชั้น 2 ห้องคอมพิวเตอร์' },
    { name: 'คอมพิวเตอร์ตั้งโต๊ะ Lenovo ThinkCentre', catId: categories[0].id, price: 28000, salvage: 2800, years: 5, date: new Date('2022-06-10'), location: 'ชั้น 1 สำนักงานใหญ่' },
    { name: 'โมนิเตอร์ LG 27-inch 4K', catId: categories[0].id, price: 12000, salvage: 1200, years: 5, date: new Date('2023-02-01'), location: 'ชั้น 2 ห้องประชุม' },
    { name: 'เครื่องพิมพ์ HP LaserJet Pro M404', catId: categories[0].id, price: 15000, salvage: 1500, years: 5, date: new Date('2022-09-15'), location: 'ชั้น 1 ห้องเอกสาร' },
    { name: 'โน๊ตบุ๊ค MacBook Air M2', catId: categories[0].id, price: 42000, salvage: 4200, years: 5, date: new Date('2024-01-10'), location: 'ชั้น 3 สำนักผู้อำนวยการ' },
    { name: 'แท็บเล็ต iPad Air', catId: categories[0].id, price: 22000, salvage: 2200, years: 4, date: new Date('2024-03-01'), location: 'ชั้น 2 ห้องสื่อสาร' },

    // Furniture
    { name: 'โต๊ะทำงาน L-Shape 120x180 ซม.', catId: categories[2].id, price: 8500, salvage: 500, years: 10, date: new Date('2022-01-05'), location: 'ชั้น 2 สำนักงาน' },
    { name: 'เก้าอี้ออฟฟิศ Ergonomic', catId: categories[2].id, price: 12000, salvage: 600, years: 8, date: new Date('2022-01-05'), location: 'ชั้น 2 สำนักงาน' },
    { name: 'ตู้เก็บเอกสาร 4 ชั้น', catId: categories[2].id, price: 4500, salvage: 300, years: 15, date: new Date('2021-06-20'), location: 'ชั้น 1 ห้องเอกสาร' },
    { name: 'โต๊ะประชุม 12 ที่นั่ง', catId: categories[2].id, price: 25000, salvage: 1500, years: 15, date: new Date('2021-03-15'), location: 'ชั้น 2 ห้องประชุม' },
    { name: 'ชุดโซฟารับแขก', catId: categories[2].id, price: 18000, salvage: 1000, years: 10, date: new Date('2022-08-01'), location: 'ชั้น 1 ล็อบบี้' },

    // Electrical
    { name: 'เครื่องปรับอากาศ Daikin 18000 BTU', catId: categories[3].id, price: 28000, salvage: 2000, years: 10, date: new Date('2022-04-10'), location: 'ชั้น 2 ห้องประชุม' },
    { name: 'เครื่องปรับอากาศ Samsung 12000 BTU', catId: categories[3].id, price: 22000, salvage: 1500, years: 10, date: new Date('2023-05-20'), location: 'ชั้น 1 สำนักงานใหญ่' },
    { name: 'เครื่องถ่ายเอกสาร Canon imageCLASS', catId: categories[3].id, price: 35000, salvage: 3000, years: 7, date: new Date('2022-11-01'), location: 'ชั้น 1 ห้องเอกสาร' },
    { name: 'โปรเจกเตอร์ Epson EB-X51', catId: categories[3].id, price: 25000, salvage: 2000, years: 7, date: new Date('2023-07-15'), location: 'ชั้น 2 ห้องประชุม' },

    // Network
    { name: 'เราเตอร์ Cisco RV345', catId: categories[5].id, price: 15000, salvage: 1000, years: 8, date: new Date('2022-02-01'), location: 'ชั้น 1 ห้องเซิร์ฟเวอร์' },
    { name: 'สวิตช์ Cisco Catalyst 24-Port', catId: categories[5].id, price: 18000, salvage: 1200, years: 8, date: new Date('2022-02-01'), location: 'ชั้น 1 ห้องเซิร์ฟเวอร์' },
    { name: 'Access Point Ubiquiti UAP-AC-Pro', catId: categories[5].id, price: 8000, salvage: 500, years: 6, date: new Date('2023-04-01'), location: 'ชั้น 2 จุด WiFi' },

    // Vehicles
    { name: 'รถยนต์ Toyota Corolla 2023', catId: categories[4].id, price: 850000, salvage: 85000, years: 10, date: new Date('2023-06-01'), location: 'อาคารจอดรถ ชั้น B1' },
    { name: 'รถจักรยานยนต์ Honda Click 160', catId: categories[4].id, price: 75000, salvage: 7500, years: 7, date: new Date('2024-01-20'), location: 'อาคารจอดรถ ชั้น B1' },
  ];

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const yearsElapsed = (now.getTime() - a.date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualDep = (a.price - a.salvage) / a.years;
    const currentVal = Math.max(a.salvage, a.price - annualDep * yearsElapsed);

    await db.asset.create({
      data: {
        sku: `AST-${String(i + 1).padStart(5, '0')}`,
        name: a.name,
        categoryId: a.catId,
        purchasePrice: a.price,
        salvageValue: a.salvage,
        purchaseDate: a.date,
        currentValue: Math.round(currentVal * 100) / 100,
        usefulLifeYears: a.years,
        location: a.location,
        warrantyExpiry: new Date(a.date.getTime() + (a.years * 365.25 * 0.6 * 24 * 60 * 60 * 1000)),
        status: i === 4 ? 'MAINTENANCE' : (i === 17 ? 'BORROWED' : 'AVAILABLE'),
      }
    });
  }

  // Create borrow records
  const allAssets = await db.asset.findMany();
  await db.borrowRecord.create({
    data: {
      assetId: allAssets[17].id, // Honda Click
      userId: user1.id,
      borrowDate: new Date('2025-06-01'),
      expectedReturnDate: new Date('2025-06-15'),
      status: 'APPROVED',
      approvedById: staff1.id,
      notes: 'ใช้ในการปฏิบัติงานนอกสถานที่'
    }
  });

  await db.borrowRecord.create({
    data: {
      assetId: allAssets[0].id, // Dell Latitude
      userId: user2.id,
      borrowDate: new Date('2025-07-01'),
      expectedReturnDate: new Date('2025-07-10'),
      status: 'PENDING',
      notes: 'ขอใช้ในการนำเสนอโครงการ'
    }
  });

  await db.borrowRecord.create({
    data: {
      assetId: allAssets[2].id, // Lenovo Desktop
      userId: user3.id,
      borrowDate: new Date('2025-05-01'),
      expectedReturnDate: new Date('2025-05-15'),
      actualReturnDate: new Date('2025-05-14'),
      status: 'RETURNED',
      approvedById: staff1.id,
      notes: 'ใช้ชั่วคราวระหว่างซ่อมคอมเดิม'
    }
  });

  // Create maintenance logs
  await db.maintenanceLog.create({
    data: {
      assetId: allAssets[4].id, // HP Printer - in maintenance
      description: 'เปลี่ยนตลับหมึกและรอลูกกลิ้ง มีปัญหากระดาษติด',
      cost: 3500,
      status: 'IN_PROGRESS',
      date: new Date('2025-07-10')
    }
  });

  await db.maintenanceLog.create({
    data: {
      assetId: allAssets[12].id, // Daikin AC
      description: 'ทำความสะอาดฟิลเตอร์และเติมก๊าซเครื่องปรับอากาศ',
      cost: 2500,
      status: 'COMPLETED',
      date: new Date('2025-06-15')
    }
  });

  await db.maintenanceLog.create({
    data: {
      assetId: allAssets[2].id, // Lenovo Desktop
      description: 'อัพเกรด RAM จาก 8GB เป็น 16GB',
      cost: 1800,
      status: 'COMPLETED',
      date: new Date('2025-04-20')
    }
  });

  // Create notifications
  await db.notification.create({ data: { userId: staff1.id, title: 'คำขอยืมครุภัณฑ์ใหม่', message: 'ธนกร มั่งมี ขอยืม โน๊ตบุ๊ค Dell Latitude 5540', type: 'INFO', link: 'borrow' } });
  await db.notification.create({ data: { userId: user2.id, title: 'คำขอยืมอนุมัติแล้ว', message: 'คำขอยืมโน๊ตบุ๊ค Dell Latitude 5540 ได้รับการอนุมัติ', type: 'SUCCESS', link: 'borrow' } });
  await db.notification.create({ data: { userId: staff1.id, title: 'แจ้งเตือนบำรุง', message: 'เครื่องพิมพ์ HP LaserJet Pro M404 กำลังซ่อมบำรุง', type: 'WARNING', link: 'maintenance' } });
  await db.notification.create({ data: { userId: null, title: 'ประกาศระบบ', message: 'ระบบบริหารจัดการครุภัณฑ์เวอร์ชัน 1.0 เปิดใช้งานแล้ว', type: 'INFO' } });

  console.log('✅ Seed data created successfully');
  console.log(`  - ${categories.length} categories`);
  console.log(`  - 6 users (1 admin, 2 staff, 3 users)`);
  console.log(`  - ${assets.length} assets`);
  console.log(`  - 3 borrow records`);
  console.log(`  - 3 maintenance logs`);
  console.log(`  - 4 notifications`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
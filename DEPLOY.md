# 🚀 Deployment Guide / คู่มือการ Deploy

## Prerequisites / ข้อกำหนดเบื้องต้น

- โค้ดอยู่บน GitHub repository (push แล้ว)
- มีบัญชี Railway หรือ Vercel (หรือทั้งสองอย่าง)
- สำหรับ Vercel: ต้องมีบัญชี [Turso](https://turso.tech) และสร้างฐานข้อมูลเรียบร้อยแล้ว

---

## 🏆 Option A: Railway (แนะนำ — ง่ายที่สุด)

Railway ใช้ Dockerfile ที่มีในโปรเจกต์ พร้อม SQLite ในตัว ไม่ต้องตั้งค่าฐานข้อมูลภายนอก

### ขั้นตอน / Steps:

1. **Push to GitHub**
   ```bash
   git add -A && git commit -m "deploy: ready" && git push
   ```

2. **เปิด Railway** → [railway.app](https://railway.app) → New Project → Deploy from GitHub repo

3. **เลือก repository** ของคุณ → Railway จะ detect Dockerfile อัตโนมัติ

4. **รอ build** (ประมาณ 2-4 นาที) → เปิด Public URL → ใช้งานได้เลย!

> **หมายเหตุ:** Railway ใช้ ephemeral filesystem — ข้อมูลจะหายเมื่อ redeploy
> หากต้องการข้อมูลถาวร ให้เพิ่ม **Volume** สำหรับโฟลเดอร์ `db/` ใน Railway settings

---

## Option B: Vercel + Turso

⚠️ **Vercel ไม่รองรับ SQLite ไฟล์** → ต้องใช้ Turso (SQLite บน cloud) เท่านั้น

### ขั้นตอน / Steps:

#### Step 1: ติดตั้ง Turso CLI + สร้าง Database
```bash
# ติดตั้ง Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# ล็อกอิน (จะเปิด browser)
turso auth login

# สร้าง database ฟรี
turso db create asset-mgmt

# ดู URL ของ database
turso db show asset-mgmt --url
# จะได้เช่น: libsql://asset-mgmt-yourname.turso.io

# สร้าง auth token
turso db tokens create asset-mgmt
# จะได้ token ยาวๆ มา 1 ชุด
```

#### Step 2: Push Schema + Seed ข้อมูล
```bash
# แทน <URL> และ <TOKEN> ด้วยค่าจริงจาก Step 1
export DATABASE_URL="libsql://asset-mgmt-yourname.turso.io"
export DATABASE_AUTH_TOKEN="your-token-here"

# สร้างตาราง
npx prisma db push

# ใส่ข้อมูลตัวอย่าง
npx tsx prisma/seed.ts
```

> 💡 **ใช้ script อัตโนมัติได้:** `bash setup-turso.sh`

#### Step 3: ตั้งค่า Vercel
1. เปิด [vercel.com](https://vercel.com) → Import Project → เลือก repo
2. ไปที่ **Settings → Environment Variables** เพิ่ม 2 ค่า:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://asset-mgmt-yourname.turso.io` |
| `DATABASE_AUTH_TOKEN` | `token ที่ได้จาก turso db tokens create` |

3. ไปที่ **Deployments** → คลิก **Redeploy**

#### Step 4: เข้าใช้งาน
เปิด URL ของ Vercel → เลือกผู้ใช้ `สมชาย ใจดี (ADMIN)` → เข้าสู่ระบบ

---

## ข้อมูลตัวอย่าง (Seed Data)

| ประเภท | จำนวน |
|--------|--------|
| หมวดหมู่ (Categories) | 6 |
| ผู้ใช้ (Users) | 6 (1 ADMIN, 2 STAFF, 3 USER) |
| ครุภัณฑ์ (Assets) | 21 |
| รายการยืม (Borrow records) | 3 |
| บันทึกซ่อมบำรุง (Maintenance) | 3 |
| การตรวจนับ (Audit) | — |

**Admin login:** เลือก `สมชาย ใจดี (ADMIN)` จาก dropdown
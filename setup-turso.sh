#!/bin/bash
# ============================================================
# Turso Setup Script for Asset Management System
# ใช้สคริปต์นี้หลังติดตั้ง Turso CLI แล้ว
# ============================================================

set -e

echo "🔧 Turso Setup Script"
echo "======================"

# ตรวจสอบว่าติดตั้ง turso แล้วหรือยัง
if ! command -v turso &> /dev/null; then
    echo "❌ ยังไม่ได้ติดตั้ง Turso CLI"
    echo "ติดตั้งด้วย: curl -sSfL https://get.tur.so/install.sh | bash"
    exit 1
fi

echo "✅ Turso CLI พร้อมแล้ว"

# ตรวจสอบว่า login แล้วหรือยัง
if ! turso auth whoami &> /dev/null; then
    echo "🔐 กรุณาล็อกอินก่อน:"
    turso auth login
fi

echo "✅ ล็อกอินแล้ว"

# สร้าง database
DB_NAME="asset-mgmt"
echo ""
echo "📦 กำลังสร้าง database: ${DB_NAME}..."

# เช็กว่ามี database ชื่อนี้แล้วหรือยัง
if turso db list 2>/dev/null | rg -q "$DB_NAME"; then
    echo "⚠️  Database '${DB_NAME}' มีอยู่แล้ว จะใช้ database เดิม"
else
    turso db create "$DB_NAME"
    echo "✅ สร้าง database สำเร็จ"
fi

# ดึง URL และ Token
echo ""
echo "🔗 กำลังดึงข้อมูลเชื่อมต่อ..."

DB_URL=$(turso db show "$DB_NAME" --url)
AUTH_TOKEN=$(turso db tokens create "$DB_NAME")

echo ""
echo "=========================================="
echo "✅ ตั้งค่าเสร็จสมบูรณ์!"
echo "=========================================="
echo ""
echo "📌 คัดลอกค่าเหล่านี้ไปวางใน Vercel → Settings → Environment Variables:"
echo ""
echo "   DATABASE_URL ="
echo "   $DB_URL"
echo ""
echo "   DATABASE_AUTH_TOKEN ="
echo "   $AUTH_TOKEN"
echo ""
echo "=========================================="
echo ""
echo "🚀 ขั้นตอนต่อไป:"
echo "   1. Push schema ไป Turso (รันคำสั่งด้านล่าง):"
echo ""
echo "      DATABASE_URL=\"$DB_URL\" \\"
echo "      DATABASE_AUTH_TOKEN=\"$AUTH_TOKEN\" \\"
echo "      npx prisma db push"
echo ""
echo "   2. Seed ข้อมูลตัวอย่าง:"
echo ""
echo "      DATABASE_URL=\"$DB_URL\" \\"
echo "      DATABASE_AUTH_TOKEN=\"$AUTH_TOKEN\" \\"
echo "      npx tsx prisma/seed.ts"
echo ""
echo "   3. ตั้งค่า Environment Variables ใน Vercel ด้วยค่าด้านบน"
echo "   4. Redeploy บน Vercel"
echo ""
echo "=========================================="
echo ""
read -p "ต้องการ push schema และ seed ข้อมูลเลยตอนนี้หรือไม่? (y/n): " DO_PUSH

if [ "$DO_PUSH" = "y" ] || [ "$DO_PUSH" = "Y" ]; then
    echo ""
    echo "📤 กำลัง push schema..."
    DATABASE_URL="$DB_URL" DATABASE_AUTH_TOKEN="$AUTH_TOKEN" npx prisma db push
    echo "✅ Push schema สำเร็จ"

    echo ""
    echo "🌱 กำลัง seed ข้อมูลตัวอย่าง..."
    DATABASE_URL="$DB_URL" DATABASE_AUTH_TOKEN="$AUTH_TOKEN" npx tsx prisma/seed.ts
    echo "✅ Seed ข้อมูลสำเร็จ"

    echo ""
    echo "🎉 ทุกอย่างพร้อมแล้ว! ไปตั้งค่า Vercel แล้ว Redeploy ได้เลย"
fi
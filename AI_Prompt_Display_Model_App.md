# AI Prompt: แอปพลิเคชันบันทึกจำนวนสินค้าตั้งโชว์ (Display Model Count App)

> ไฟล์นี้คือ "AI Prompt / System Specification" สำหรับป้อนให้ AI coding agent (เช่น Claude Code)
> เพื่อสร้างเว็บแอปพลิเคชันแบบครบวงจร ตั้งแต่ฝั่งผู้ใช้งาน (มือถือ) และฝั่งแอดมิน (เว็บ)

---

## 1. ภาพรวมโปรเจกต์ (Objective)

สร้างเว็บแอปพลิเคชัน (Web Application, Responsive รองรับมือถือเป็นหลัก) เพื่อให้พนักงานหน้าร้าน
**บันทึกจำนวนสินค้าที่ตั้งโชว์ (Display) ของแต่ละรุ่น (Model) ในแต่ละสาขา (Store)**
โดยผู้ใช้ทั่วไป (User) กรอกข้อมูลผ่านมือถือ และแอดมิน (Admin) บริหารจัดการข้อมูลทั้งหมดผ่านเว็บ

**กลุ่มผู้ใช้งาน**
- **User (พนักงานหน้าร้าน)** — ใช้งานผ่านมือถือ ไม่ต้องมี Login เลือกร้าน → กรอกชื่อ/เบอร์โทร → เลือกสินค้า → นับจำนวน
- **Admin** — ใช้งานผ่านเว็บ (Desktop/Mobile) ต้อง Login ด้วยรหัสผ่าน จัดการ Dashboard, ดูรายการที่บันทึก, จัดการ Dimension (Store/Model) ได้ทุกอย่าง (ดู/แก้ไข/ลบ/อัปโหลด)
- **Viewer** — ใช้งานผ่านเว็บ ต้อง Login ด้วยรหัสผ่าน **ดูข้อมูลได้อย่างเดียว** (Dashboard, Sell list) **ห้ามแก้ไข/ลบ/อัปโหลด Dimension และห้ามลบข้อมูลใด ๆ ในระบบ**

---

## 2. สถาปัตยกรรมระบบ & การ Deploy (Tech Stack)

| หัวข้อ | รายละเอียด |
|---|---|
| Source control | GitHub — บัญชี/องค์กร: `sirisakhaier` |
| Hosting / Deploy | Cloudflare (Cloudflare Pages / Workers) — บัญชี: `sirisak.haier@gmail.com` |
| CI/CD | **Auto-deploy**: เมื่อมีการ `git push` ขึ้น branch หลัก (เช่น `main`) ให้ Cloudflare Build & Deploy แอปใหม่โดยอัตโนมัติ (ตั้งค่า Cloudflare Pages ให้ Connect กับ GitHub repo และเปิด Automatic Deployments) |
| แนะนำ Stack | Frontend: React หรือ Next.js (รองรับ Cloudflare Pages ได้ดี) + Backend: Cloudflare Workers/Functions หรือ Pages Functions + Database: Cloudflare D1 (SQLite) หรือ KV/R2 สำหรับไฟล์แนบ CSV |
| ภาษา UI | ภาษาไทยทั้งระบบ (Thai-first UI) |
| Responsive | ฝั่ง User ต้อง Mobile-first (ใช้งานบนมือถือเป็นหลัก) / ฝั่ง Admin รองรับ Desktop และ Mobile |

**สิ่งที่ต้องขอให้ AI agent ทำเพิ่ม**
- สร้าง GitHub Actions หรือใช้ Cloudflare Pages native Git integration สำหรับ CI/CD
- ใส่ไฟล์ `wrangler.toml` / `.github/workflows` ตามความเหมาะสมของ stack ที่เลือก
- Environment variables (เช่น ADMIN_PASSWORD) ต้องเก็บใน Cloudflare Secrets ไม่ hardcode ในโค้ด

---

## 3. โครงสร้างข้อมูล (Data Model)

ระบบมีไฟล์ Dimension หลัก 2 ไฟล์ ที่ต้อง import เข้าเป็นตารางฐานข้อมูลตั้งต้น (Seed data) และ Admin
สามารถ Download / Upload (แบบ Replace ทั้งไฟล์) ได้ภายหลัง

> **Primary Key ที่ใช้ทั่วทั้งแอป**: ใช้ค่าคีย์ธรรมชาติ (Natural Key) จากไฟล์ต้นทางโดยตรง แทนการสร้าง surrogate id เพิ่ม
> - ตาราง Store → ใช้ **`STORE_ID`** เป็น Primary Key
> - ตาราง Model → ใช้ **`Model`** เป็น Primary Key
> - ทุกจุดที่มีการอ้างอิง/join/filter ข้อมูลสาขาหรือสินค้าในแอป (User flow, Admin, Report) ให้อ้างอิงผ่าน `STORE_ID` และ `Model` เท่านั้น ไม่ใช้ชื่อ (Name) เป็นตัวอ้างอิง เพราะชื่ออาจซ้ำหรือเปลี่ยนแปลงได้

### 3.1 Dimension_Store.csv (ตารางร้านค้า/สาขา) — ฉบับย่อ (Minimum columns)

| คอลัมน์ | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| **Customer** | ชื่อร้านค้า/ห้าง (TH) — ใช้เป็นตัวกรองแรกในหน้า Landing | `บิ๊กซี`, `โฮมโปร`, `โลตัส`, `แม๊คโคร`, `เพาเวอร์บาย`, `เพาเวอร์มอลล์`, `ดูโฮม`, `โกลบอลเฮ้าส์`, `ไทยวัสดุ` (รวม 9 Customer) |
| Store ID Customer | รหัสสาขาของฝั่งลูกค้า/ห้างเอง (ใช้ภายในอ้างอิง ไม่จำเป็นต้องแสดงผู้ใช้) | `11151:Samui` |
| **STORE_ID** | รหัสสาขา — **Primary Key (PK) ของตาราง Store**, Unique | `S00938` |
| STORE_NAME | ชื่อสาขา (EN) | `BC-SAMUI-SURATTHANI` |
| **Store Name TH** | ชื่อสาขา (TH) — ใช้แสดงผลในหน้า User | `เกาะสมุย` |
| Province TH | จังหวัด (TH) | `สุราษฎร์ธานี` |
| **Region TH** | ภูมิภาค (TH) — ใช้เป็นตัวกรองที่ 2 ในหน้า Landing | `ภาคเหนือ`, `ภาคตะวันออกเฉียงเหนือ`, `ภาคตะวันตกและตะวันออก`, `ภาคใต้`, `กรุงเทพฯและภาคกลาง` |
| **Active-Inactive** | สถานะเปิด/ปิดใช้งานสาขาในแอป | ค่ามีแค่ 2 แบบ: `Active` / `Not active` — **แสดงเฉพาะ `Active` ในฝั่ง User เท่านั้น** |

> ประมาณ 1,056 แถว / 9 Customer — ไฟล์นี้ถูกลดคอลัมน์ให้เหลือเฉพาะที่จำเป็นต่อการใช้งานแอป (ตัดคอลัมน์ CUSTOMER_NAME (EN)/CUSTOMER_TH แยก, PROVINCE (EN), STORE_TYPE, CHANNEL, REMARK (EN/TH ซ้ำ), CNT ออกจากไฟล์ต้นทาง) ทำให้ import และดูแลง่ายขึ้น

### 3.2 Dimension_Model.csv (ตารางรุ่นสินค้า)

| คอลัมน์ | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| Model | รหัสรุ่นสินค้า — **Primary Key (PK) ของตาราง Model**, Unique | `RT549N4TBN` |
| Brand | แบรนด์ | `Samsung`, `Hisense`, `LG`, `Toshiba`, `Sharp`, `HITACHI`, `Haier`, `MIDEA`, `Electrolux`, `TCL`, ฯลฯ (รวม ~28 แบรนด์) |
| Category | หมวดหมู่สินค้า | `Refrigerator`/`RF`, `Washing machine`/`WM`, `Television`/`TV`, `Freezer`/`FZ`, `Water heater`/`WH`, `Water dispenser`, `AC` — **หมายเหตุ: ข้อมูลดิบมีทั้งชื่อเต็มและตัวย่อปนกัน ให้ Normalize เป็นชื่อมาตรฐานเดียวตอน import (map ตัวย่อ → ชื่อเต็ม)** |
| SubCategory | หมวดย่อย | `2 Door`, `Top Load`, `UHD`, `Twin Tub`, `SBS` ฯลฯ (มีค่า `!n/a` = ไม่มีหมวดย่อย ให้ซ่อน) |
| Active-Inactive | สถานะรุ่นสินค้า | `Active` / `Not active` — เฉพาะ `Active` เท่านั้นที่แสดงในแอป |
| Remark | หมายเหตุ | |
| Update by | ผู้แก้ไขล่าสุด | |
| Update date | วันที่แก้ไขล่าสุด | |

> ประมาณ 1,438 แถว

### 3.3 ตารางที่ต้องสร้างเพิ่ม (Transactional Tables)

**Table: `display_entries`** (บันทึกการนับ Display ต่อ 1 สาขา ต่อ 1 รอบ)
- `id` (PK, surrogate — ใช้เฉพาะตารางนี้เพราะ 1 สาขาบันทึกได้หลายรอบ)
- `store_id` (**FK → Store.STORE_ID**)
- `user_name` (ชื่อผู้กรอก)
- `user_phone` (เบอร์โทร)
- `submitted_at` (วันเวลาที่ submit, NULL = ยังไม่ submit/draft)
- `created_at`, `updated_at`

**Table: `display_entry_items`** (รายละเอียดรายรุ่นในแต่ละ entry)
- `id` (PK, surrogate)
- `entry_id` (FK → display_entries.id)
- `model` (**FK → Model.Model**)
- `qty` (จำนวนที่ตั้งโชว์ — integer ≥ 0)
- `updated_at`
- Unique constraint: (`entry_id`, `model`) ห้ามซ้ำ — 1 รุ่นมีได้แค่ 1 แถวต่อ 1 entry

**Table: `admin_users`** (สำหรับ Login แอดมิน/Viewer — เริ่มต้น seed 2 user)
- `id`, `username`, `password_hash` (เก็บ hash ไม่เก็บ plain text), `role`
- ค่าเริ่มต้น (Seed data):
  | username | role | password (ตั้งต้น) |
  |---|---|---|
  | `admin` | `admin` | `admin1234` |
  | `viewer` | `viewer` | `viewer1234` |
- `role` มี 2 ค่า: `admin` (สิทธิ์เต็ม) และ `viewer` (ดูอย่างเดียว) — ใช้ตรวจสอบสิทธิ์ทุกครั้งที่เข้าถึง route/endpoint ฝั่ง backend (ห้าม check สิทธิ์แค่ฝั่ง frontend)

---

## 4. Flow ฝั่งผู้ใช้งาน (User Flow — Mobile)

### ขั้นตอนที่ 1: Landing Page — เลือกร้านค้า
1. ผู้ใช้เปิดแอป (ไม่ต้อง Login)
2. เลือก **Customer** — dropdown/รายการ แสดงรายชื่อจากคอลัมน์ `Customer` (เช่น บิ๊กซี, โฮมโปร, โลตัส ฯลฯ) เฉพาะที่มี Store อย่างน้อย 1 สาขาที่ `Active-Inactive = Active`
3. เลือก **Region TH** — dropdown แสดงเฉพาะภูมิภาคที่มีสาขา Active ของ Customer ที่เลือกไว้
4. ระบบแสดงรายการ **Store** ที่กรองตาม Customer + Region ที่เลือก (เฉพาะ `Active-Inactive = Active`) ให้เลือก 1 ร้าน
   - แสดงชื่อ `Store Name TH` และจังหวัด (`Province TH`) เป็นหลัก, ใช้ `STORE_ID` เป็น key อ้างอิงภายใน

> **หมายเหตุ UI**: บนหน้า Landing Page (มุมบน/ท้ายหน้า) ต้องมี **ปุ่ม "เข้าสู่ระบบ" (Sign in)** แยกต่างหากสำหรับ **Admin หรือ Viewer** เพื่อไม่ให้ปะปนกับ flow ของ User ทั่วไป
> - กดปุ่มแล้วไปหน้า Login รวม (`/login`) ที่มีช่องกรอก **Username** และ **Password** (ช่อง Password ต้องเป็น input type `password` เพื่อ**ไม่แสดงตัวอักษรรหัสผ่านบนหน้าจอ** — มีปุ่ม toggle แสดง/ซ่อนรหัสผ่านได้ตามมาตรฐาน)
> - ระบบตรวจสอบ `username` + `password` กับตาราง `admin_users` แล้วอ่านค่า `role` เพื่อ redirect: `role = admin` → เข้า Admin Dashboard (สิทธิ์เต็ม), `role = viewer` → เข้า Dashboard แบบ **View only** (ซ่อน/ปิดใช้งานปุ่มแก้ไข ลบ อัปโหลดทั้งหมด)
> - Login ผิดพลาดแสดงข้อความ error ทั่วไป (ไม่ระบุว่า username หรือ password ผิดจุดไหน เพื่อความปลอดภัย)

### ขั้นตอนที่ 2: กรอกข้อมูลผู้กรอก
5. กรอก **ชื่อ-นามสกุล** และ **เบอร์โทรศัพท์** (validate เบอร์โทร 9-10 หลัก)
6. กด "ถัดไป"

### ขั้นตอนที่ 3: ตรวจสอบข้อมูลเดิม (ถ้ามี)
7. ระบบเช็คว่า `store_id` ที่เลือกมี `display_entries` ที่เคย submit หรือมี draft ล่าสุดหรือไม่
   - **ถ้ามีข้อมูลเดิม** → แสดงข้อมูลจำนวนที่เคยบันทึกไว้ล่าสุดของร้านนั้น (โหลดมาเป็นค่าตั้งต้นให้แก้ไขต่อ) พร้อมแจ้งวันที่บันทึกล่าสุดและชื่อผู้บันทึกก่อนหน้า
   - **ถ้าไม่มีข้อมูลเดิม** → เริ่มนับใหม่จาก 0 ทุกรุ่น

### ขั้นตอนที่ 4: เลือกหมวดหมู่ → แบรนด์ → รายการรุ่น
8. เลือก **Category** (เฉพาะหมวดที่มีสินค้า Active)
9. เลือก **Brand** (กรองตาม Category ที่เลือก)
10. แสดง **รายการรุ่นสินค้า (Model list)** ที่ตรงกับ Category + Brand (เฉพาะ `Active`) เป็นการ์ด/รายการ พร้อมตัวเลขจำนวนปัจจุบันของแต่ละรุ่น

### ขั้นตอนที่ 5: นับจำนวน Display
11. แต่ละรุ่นในรายการ:
    - **แตะที่การ์ด/ปุ่ม 1 ครั้ง = +1** ในจำนวน Display ของรุ่นนั้น (นับซ้ำได้เรื่อย ๆ)
    - มีปุ่ม **ลด (-1)** และช่องกรอกตัวเลขตรง เพื่อแก้ไข/ตั้งค่าเป็น 0 ได้
    - แสดงตัวเลขจำนวนปัจจุบันชัดเจนบนการ์ด (Real-time)
12. ผู้ใช้สามารถย้อนกลับไปเลือก Category/Brand อื่นเพื่อนับรุ่นอื่นต่อได้ โดยจำนวนที่กรอกไว้ก่อนหน้าต้องไม่หาย (เก็บ state ทั้งหมดไว้จนกว่าจะ submit)
13. เมื่อกรอกครบ กด **"บันทึก / Submit"**
    - ระบบบันทึก `display_entries` (พร้อม `submitted_at`) และ `display_entry_items` ทุกรุ่นที่มีค่า (รวมรุ่นที่ = 0 ถ้าผู้ใช้เคยตั้งไว้แล้วลดเป็น 0)
    - แสดงหน้าสรุปผล/ขอบคุณ

**ข้อกำหนดเพิ่มเติมด้าน UX**
- ต้องใช้งานง่ายด้วยนิ้วโป้งบนมือถือ (ปุ่มใหญ่, แตะง่าย)
- ควร Auto-save เป็น draft ระหว่างทาง (ป้องกันข้อมูลหายหากปิดแอป/เน็ตหลุด)
- แสดง breadcrumb/ปุ่มย้อนกลับทุกขั้นตอน

---

## 5. Flow ฝั่งแอดมิน / Viewer (Web)

### 5.1 การเข้าสู่ระบบ
- ใช้หน้า Login รวม (`/login`) เดียวกันสำหรับทั้ง Admin และ Viewer (ตามที่ระบุในหัวข้อ 4 ขั้นตอนที่ 1) — กรอก Username + Password (ซ่อนรหัสผ่านด้วย input type `password`)
- **Admin**: username `admin` / รหัสผ่านเริ่มต้น `admin1234`
- **Viewer**: username `viewer` / รหัสผ่านเริ่มต้น `viewer1234`
- รหัสผ่านทั้งสองต้องเก็บเป็น hash ในฐานข้อมูล/ค่าลับใน Cloudflare Secret และแนะนำให้เปลี่ยนได้ภายหลังผ่านหน้า Settings (เฉพาะ Admin เท่านั้นที่แก้ไขรหัสผ่านของ user อื่นได้)
- หลัง Login สำเร็จ เข้าสู่ **Landing Page เฉพาะ Admin/Viewer** (Dashboard) ที่แยกจากหน้า User โดยสิ้นเชิง โดย UI จะปรับตาม `role` ที่ login เข้ามา

### 5.2 เมนูหลักของ Admin/Viewer

| เมนู | Admin | Viewer |
|---|---|---|
| Dashboard | ดูได้ | ดูได้ |
| Sell list | ดูได้ + Export ได้ | ดูได้ + Export ได้ (ไม่ลบ/แก้ไขข้อมูล) |
| Modify dimension | ดู + แก้ไข + ลบ + Download + Upload(Replace) ได้ทั้งหมด | **ดูอย่างเดียว** — ปุ่มแก้ไข/ลบ/Upload(Replace) ต้องถูก**ซ่อนหรือ disable** ทั้งหมด (Download อนุญาตให้ทำได้ เพราะเป็นการดูข้อมูล ไม่ใช่การแก้ไข) |
| ลบข้อมูลใด ๆ ในระบบ (เช่น ลบ entry, ลบแถว dimension) | ทำได้ | **ทำไม่ได้เด็ดขาด** |

1. **Dashboard**
   - สรุปภาพรวม: จำนวนสาขาที่บันทึกแล้ว/ยังไม่บันทึก (เทียบกับสาขา Active ทั้งหมด), จำนวน Display รวมทั้งหมด, แยกตาม Region/Customer/Brand/Category
   - กราฟสรุป (เช่น Top 10 Store ที่มี Display เยอะสุด, สัดส่วนตาม Brand)
   - ตัวกรองตามช่วงวันที่, Region, Customer
   - Admin และ Viewer เห็นหน้าเดียวกันทุกประการ (read-only ทั้งคู่อยู่แล้วโดยธรรมชาติของ Dashboard)

2. **Sell list** (รายการที่บันทึก)
   - ตารางแสดงรายการ `display_entries` ทั้งหมด: ร้านค้า, สาขา, ชื่อผู้กรอก, เบอร์โทร, วันเวลาที่บันทึก, จำนวนรุ่นที่กรอก, จำนวน Display รวม
   - คลิกดูรายละเอียดรายรุ่น (`display_entry_items`) ของแต่ละ entry ได้
   - ค้นหา/กรองตาม Store, Customer, Region, ช่วงวันที่, ชื่อผู้กรอก
   - Export เป็น CSV/Excel ได้ (ทั้ง Admin และ Viewer)
   - ปุ่มลบ entry (ถ้ามี) ให้แสดงเฉพาะ role `admin` เท่านั้น

3. **Modify dimension** (จัดการข้อมูลหลัก Store & Model) — **เฉพาะ Admin เท่านั้น** (Viewer เข้าดูหน้านี้ได้แบบ read-only table แต่ทุกปุ่มที่แก้ไข/ลบ/อัปโหลดต้องถูกซ่อนหรือ disable)
   - แท็บ **Store**: ตารางแสดงคอลัมน์ทั้งหมดของ Dimension_Store (Customer, Store ID Customer, STORE_ID, STORE_NAME, Store Name TH, Province TH, Region TH, Active-Inactive) แก้ไขค่า `Active-Inactive` ได้เป็นรายแถว (Admin เท่านั้น)
     - ปุ่ม **เปิด/ปิดใช้งาน (Active/Not active)** แบบ bulk select ได้ทั้งระดับ Customer, ระดับ Region, หรือเลือกเป็นรายสาขา (Admin เท่านั้น)
   - แท็บ **Model**: ตารางแก้ไข `Active-Inactive` ต่อ Brand, ต่อ Category, ต่อ Model รายตัว หรือ bulk (Admin เท่านั้น)
   - ปุ่ม **Download** — ดาวน์โหลดไฟล์ CSV ปัจจุบันของ Store หรือ Model (ตาม format เดิมของไฟล์ต้นฉบับ) — **Admin และ Viewer ทำได้ทั้งคู่**
   - ปุ่ม **Upload (Replace)** — อัปโหลดไฟล์ CSV ใหม่เพื่อ **แทนที่ข้อมูลเดิมทั้งหมด** ของตารางนั้น — **Admin เท่านั้น**
     - ต้องมีหน้าจอ Preview/Validate ก่อนยืนยัน (เช็คคอลัมน์ครบ, รูปแบบถูกต้อง, เช็คว่า `STORE_ID`/`Model` ไม่ซ้ำกันเองภายในไฟล์ที่อัปโหลด เพราะเป็น Primary Key) และมีปุ่ม "ยืนยันแทนที่ข้อมูล" พร้อม popup เตือนเนื่องจากเป็นการ replace ข้อมูลทั้งหมด
     - หาก `STORE_ID` หรือ `Model` ตัวใดถูกลบออกจากไฟล์ใหม่แต่มีประวัติการบันทึก (`display_entries`/`display_entry_items`) อ้างอิงอยู่ ให้แจ้งเตือนแอดมินก่อนยืนยัน (ข้อมูลประวัติจะยังเก็บไว้ แต่ค่านั้นจะไม่ปรากฏใน dropdown ของ User อีกต่อไป)
     - เก็บ log การอัปโหลด (ใครอัปโหลด, เมื่อไหร่) เพื่อ audit

### 5.3 สิทธิ์การเข้าถึง (Authorization)
- เฉพาะผู้ที่ Login แล้วเท่านั้นที่เข้าเมนู `/admin/*` ได้ (Route protection + Session/JWT ที่เก็บค่า `role` ไว้ใน token)
- **ต้องตรวจสอบสิทธิ์ตาม `role` ที่ฝั่ง Backend/API ทุก endpoint** ที่เป็นการแก้ไข/ลบ/อัปโหลด (ไม่ใช่แค่ซ่อนปุ่มฝั่ง Frontend) — หาก Viewer พยายามเรียก endpoint แก้ไข/ลบ/อัปโหลดโดยตรง ต้อง reject ด้วย HTTP 403
- Session timeout ตามความเหมาะสม (เช่น 8 ชั่วโมง)

---

## 6. ข้อกำหนดทางเทคนิคเพิ่มเติม

- **ภาษา**: UI ทั้งหมดเป็นภาษาไทย, ข้อความ error/validation เป็นภาษาไทย
- **Responsive Design**: User = Mobile-first, Admin = รองรับทั้ง Desktop และ Mobile
- **Performance**: หน้ารายการ Model (~1,400 รายการ) ต้องมี pagination/lazy-load หรือ filter ก่อนแสดงผล ไม่โหลดทั้งหมดพร้อมกัน
- **Data Validation**:
  - เบอร์โทรศัพท์ต้องเป็นตัวเลข
  - จำนวน Display ต้องเป็นจำนวนเต็ม ≥ 0
- **Security**:
  - Sanitize input ทุกจุด ป้องกัน SQL Injection / XSS
  - Password ของทั้ง Admin และ Viewer เก็บแบบ hash (bcrypt หรือเทียบเท่า) ห้ามเก็บ/แสดง plain text ที่ใดในระบบ
  - Rate-limit หน้า Login ป้องกัน brute-force
  - บังคับตรวจสอบ `role` ที่ Backend ทุก endpoint ที่แก้ไข/ลบ/อัปโหลดข้อมูล (Viewer ต้องไม่สามารถ bypass ผ่าน API ได้แม้ frontend จะซ่อนปุ่มแล้วก็ตาม)
- **Deployment**:
  - Repo: GitHub `sirisakhaier`
  - Hosting: Cloudflare (บัญชี `sirisak.haier@gmail.com`)
  - ตั้งค่า Cloudflare Pages ให้ auto-deploy ทุกครั้งที่ push เข้า branch `main`
  - แนะนำแยก branch `dev`/`staging` สำหรับทดสอบก่อนขึ้น production (ถ้าต้องการ)

---

## 7. สรุป Task ให้ AI Agent ดำเนินการ

1. Setup โปรเจกต์ (เลือก stack: แนะนำ Next.js + Cloudflare Pages + D1) และเชื่อมต่อ GitHub repo `sirisakhaier`
2. สร้าง Database schema ตามหัวข้อ 3 และเขียน Script Import ข้อมูลเริ่มต้นจาก `Dimension_Store.csv` และ `Dimension_Model.csv`
3. พัฒนาหน้า User flow ตามหัวข้อ 4 (Mobile-first)
4. พัฒนาหน้า Admin/Viewer flow ตามหัวข้อ 5 (Login รวม 1 หน้าแยก role, Dashboard, Sell list, Modify dimension เฉพาะ Admin พร้อม Download/Upload-Replace, บังคับสิทธิ์ Viewer = ดูอย่างเดียวทั้ง Frontend และ Backend)
5. ตั้งค่า Cloudflare Pages ให้ auto-deploy จาก GitHub เมื่อมี push
6. ทดสอบ end-to-end: เลือกร้าน → กรอกข้อมูล → นับ Display → Submit → Admin เห็นข้อมูลใน Sell list และ Dashboard

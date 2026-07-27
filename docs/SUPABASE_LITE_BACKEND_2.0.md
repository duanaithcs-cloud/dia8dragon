# Dia8Dragon 2.0 — Supabase Lite Backend

Backend này dành cho một giáo viên hoặc nhóm nhỏ dưới 50 học sinh. Dữ liệu chính được giữ trong hai bảng Supabase, còn khóa dịch vụ chỉ nằm trong Vercel Environment Variables.

## 1. Tạo Supabase project

Tạo một project miễn phí và mở **SQL Editor**. Chạy toàn bộ SQL sau:

```sql
create table if not exists public.dia8_workspaces (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.dia8_submissions (
  workspace_id text not null,
  class_id text not null,
  assignment_id text not null,
  student_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, assignment_id, student_id)
);

create index if not exists dia8_submissions_class_student_idx
  on public.dia8_submissions (workspace_id, class_id, student_id);

alter table public.dia8_workspaces enable row level security;
alter table public.dia8_submissions enable row level security;

-- Không tạo policy public. Vercel Function sử dụng service role key ở phía máy chủ.
```

## 2. Thêm Environment Variables trong Vercel

Mở **Vercel → dia8dragon → Settings → Environment Variables** và thêm:

- `SUPABASE_URL`: Project URL của Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key của Supabase. Không đưa khóa này lên GitHub.
- `DIA8_TEACHER_SYNC_KEY`: một mật khẩu đồng bộ riêng, dài ít nhất 16 ký tự.
- `DIA8_WORKSPACE_ID`: có thể đặt `dia8dragon-primary`.

Áp dụng cho Production, Preview và Development nếu cần. Sau đó Redeploy.

## 3. Cơ chế bảo mật

- Trình duyệt không nhìn thấy service role key.
- Bảng Supabase không có policy public.
- Giáo viên đồng bộ bằng `DIA8_TEACHER_SYNC_KEY`.
- Học sinh chỉ truy cập bằng mã lớp và mã cá nhân do giáo viên cấp.
- Học sinh chỉ nhận phản hồi đã được giáo viên đánh dấu **Đã công bố**.

## 4. Cách sử dụng

### Giáo viên

1. Vào **Bảng giáo viên → Đồng bộ**.
2. Nhập mã đồng bộ giáo viên.
3. Chọn **Đẩy lên mây** để lưu lớp, nhiệm vụ và phản hồi.
4. Chọn **Kéo về máy** để nhận bài làm mới của học sinh.

### Học sinh

1. Mở **Bài giao** trên thanh điều hướng.
2. Nhập mã lớp và mã truy cập cá nhân.
3. Xem nhiệm vụ, nhập bài làm và tự phản ánh.
4. Sau khi giáo viên công bố, học sinh thấy điểm và phản hồi.

## 5. Giới hạn khuyến nghị

- Dưới 50 học sinh.
- Mỗi bài làm dạng văn bản dưới 30.000 ký tự.
- Không dùng để lưu video hoặc tệp dung lượng lớn.
- Nên xuất bản sao CSV/PDF định kỳ.

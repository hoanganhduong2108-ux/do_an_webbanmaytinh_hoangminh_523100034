# ĐỒ ÁN KỲ - WEBSITE BÁN MÁY TÍNH VÀ LINH KIỆN

## 1. Thông tin sinh viên

- **Họ tên:** Hoàng Minh
- **MSSV:** 523100034
- **Lớp:** 523100A
- **GVHD:** Nguyễn Thị Mười Phương
- **GitHub GVHD:** [MuoiPhuong](https://github.com/MuoiPhuong)
- **Repository:** [do_an_webbanmaytinh_hoangminh_523100034](https://github.com/hoanganhduong2108-ux/do_an_webbanmaytinh_hoangminh_523100034)

## 2. Mục tiêu đề tài

Xây dựng website thương mại điện tử bán máy tính, laptop và linh kiện với đầy đủ chức năng:

- Tra cứu, tìm kiếm, lọc sản phẩm theo nhiều tiêu chí
- Giỏ hàng và quy trình đặt hàng hoàn chỉnh
- Quản lý tài khoản, đơn hàng, voucher
- Hệ thống phân quyền 4 vai trò: Khách vãng lai, Khách hàng, Nhân viên bán hàng, Quản trị viên
- Admin quản trị đầy đủ: sản phẩm, danh mục, đơn hàng, khách hàng, voucher, nhân viên, thống kê

## 3. Chức năng cốt lõi

### Đối với Khách hàng

- Đăng ký, đăng nhập, quên mật khẩu
- Xem, tìm kiếm, lọc sản phẩm theo CPU, RAM, SSD, GPU, giá
- Thêm vào giỏ hàng, đặt hàng, áp dụng voucher
- Quản lý tài khoản cá nhân và đơn hàng

### Đối với Nhân viên bán hàng (Staff)

- Xem và xử lý đơn hàng (xác nhận, cập nhật trạng thái)
- Tạo đơn hàng hộ khách tại showroom
- Ghi chú nội bộ vào đơn hàng
- Xem sản phẩm, tồn kho, khách hàng
- Đề xuất nhập hàng
- Xem báo cáo cá nhân

### Đối với Quản trị viên (Admin)

- Dashboard thống kê tổng quan
- CRUD sản phẩm, danh mục, voucher
- Quản lý đơn hàng, khách hàng, nhân viên
- Duyệt đề xuất nhập hàng
- Báo cáo doanh thu theo ngày/tháng/năm

## 4. Công nghệ sử dụng

- **Front-end:** EJS, HTML5, CSS3, JavaScript ES6+
- **Back-end:** Node.js 18.x, Express.js 4.x
- **Database:** MongoDB 6.0+, Mongoose 7.x
- **Authentication:** express-session, bcryptjs
- **Upload file:** multer
- **Email:** nodemailer
- **Charts:** Chart.js
- **Tools:** VS Code, GitHub Desktop, MongoDB Compass

## 5. Hướng dẫn cài đặt và chạy

### Bước 1: Clone repository

```bash
git clone https://github.com/hoanganhduong2108-ux/do_an_webbanmaytinh_hoangminh_523100034.git
cd do_an_webbanmaytinh_hoangminh_523100034

Bước 2: Cài dependencies
npm install

Bước 3: Cấu hình file .env
Tạo file .env ở thư mục gốc:
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/webbanmaytinh
SESSION_SECRET=your_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

Bước 4: Khởi động MongoDB
net start MongoDB

Bước 5: Chạy ứng dụng
npm run dev

Bước 6: Truy cập
Mở trình duyệt: http://localhost:3000
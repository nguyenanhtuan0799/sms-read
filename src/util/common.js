export function isPastDate(inputDate) {
  // Tạo đối tượng Date từ inputDate (miliseconds từ Epoch)
  const date = new Date(inputDate);

  // Tạo đối tượng Date từ ngày hiện tại
  const currentDate = new Date();

  // So sánh ngày của inputDate với ngày hiện tại
  // Lưu ý: Chúng ta chỉ quan tâm đến ngày, bỏ qua giờ, phút, giây và millisecond
  return (
    date.getFullYear() === currentDate.getFullYear() &&
    date.getMonth() === currentDate.getMonth() &&
    date.getDate() === currentDate.getDate()
  );
}

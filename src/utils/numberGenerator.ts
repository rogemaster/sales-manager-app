// 전화번호 포맷 변환
export const phoneNumberFormatter = (phoneNumber: string) => {
  if (phoneNumber.length < 11) {
    return phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
};

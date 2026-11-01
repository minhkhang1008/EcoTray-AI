export type Account = {
  email: string;
  schoolName: string;
  initial: string;
  logo?: string;
  /** "ptnk" xem bộ dữ liệu canteen PTNK; "empty" bắt đầu không có dữ liệu. */
  dataset: "ptnk" | "empty";
};

// Tài khoản trình diễn — không phải cơ chế xác thực thật.
const PASSWORD = "12345678";
const accounts: Account[] = [
  {
    email: "canteen@ptnk.edu.vn",
    schoolName: "Trường Phổ thông Năng khiếu, ĐHQG-HCM",
    initial: "P",
    logo: "./ptnk_logo.png",
    dataset: "ptnk",
  },
  {
    email: "canteen@hcm.edu.vn",
    schoolName: "Trường học TP.HCM",
    initial: "H",
    dataset: "empty",
  },
];
const SESSION_KEY = "ecotray-session-v1";

export function login(email: string, password: string): Account | null {
  const account = accounts.find(
    (a) => a.email === email.trim().toLowerCase(),
  );
  if (!account || password !== PASSWORD) return null;
  try {
    localStorage.setItem(SESSION_KEY, account.email);
  } catch {
    /* phiên chỉ tồn tại trong bộ nhớ nếu trình duyệt chặn lưu trữ */
  }
  return account;
}

export function currentAccount(): Account | null {
  try {
    const email = localStorage.getItem(SESSION_KEY);
    return accounts.find((a) => a.email === email) ?? null;
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

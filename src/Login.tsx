import { useState, type FormEvent } from "react";
import Icon from "./Icon";
import { login, type Account } from "./auth";

export default function Login({ onLogin }: { onLogin: (a: Account) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const account = login(email, password);
    if (account) onLogin(account);
    else setError("Email hoặc mật khẩu không đúng.");
  }

  return (
    <main className="login-page" id="content">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-brand">
          <span className="brandmark">
            <Icon name="leaf" size={23} />
          </span>
          EcoTray
        </div>
        <h1>Đăng nhập</h1>
        <p className="login-lead">Quản lý căn tin cho trường học.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          Đăng nhập
        </button>
      </form>
    </main>
  );
}

import { type FormEvent, useState } from "react";

type LoginScreenProps = {
  error: string | null;
  isLoading: boolean;
  onSubmit: (nickname: string) => void;
};

export function LoginScreen({ error, isLoading, onSubmit }: LoginScreenProps) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(nickname);
  }

  return (
    <section className="login-screen" aria-label="로그인">
      <form className="login-panel" onSubmit={handleSubmit}>
        <h1 className="login-title">로그인</h1>
        <p className="login-subtitle">시작하려면 닉네임을 입력하세요.</p>
        <label className="login-field">
          <span className="visually-hidden">닉네임</span>
          <input
            aria-label="닉네임"
            autoComplete="nickname"
            disabled={isLoading}
            maxLength={16}
            minLength={2}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임"
            type="text"
            value={nickname}
          />
        </label>
        <button className="neon-button login-button" disabled={isLoading} type="submit">
          {isLoading ? "접속 중..." : "로그인"}
        </button>
        {error ? <p className="login-error">{error}</p> : null}
      </form>
    </section>
  );
}

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
    <section className="login-screen" aria-label="Login">
      <form className="login-panel" onSubmit={handleSubmit}>
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Enter your nickname to start.</p>
        <label className="login-field">
          <span className="visually-hidden">Nickname</span>
          <input
            aria-label="Nickname"
            autoComplete="nickname"
            disabled={isLoading}
            maxLength={16}
            minLength={2}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="nickname"
            type="text"
            value={nickname}
          />
        </label>
        <button className="neon-button login-button" disabled={isLoading} type="submit">
          {isLoading ? "Connecting..." : "Login"}
        </button>
        {error ? <p className="login-error">{error}</p> : null}
      </form>
    </section>
  );
}

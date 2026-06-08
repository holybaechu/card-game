"use client";

import { useState, type FormEvent } from "react";

type LoginScreenProps = {
  error: string | null;
  isLoading: boolean;
  onSubmit: (nickname: string) => void;
};

export function LoginScreen({ error, isLoading, onSubmit }: LoginScreenProps) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = nickname.trim();
    if (!trimmed) {
      return;
    }

    onSubmit(trimmed);
  }

  return (
    <section className="login-screen" aria-label="로그인">
      <form className="login-panel" onSubmit={handleSubmit}>
        <h1>로그인</h1>
        <label className="login-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          className="login-input"
          id="nickname"
          name="nickname"
          type="text"
          autoComplete="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.currentTarget.value)}
          placeholder="닉네임을 입력하세요"
          disabled={isLoading}
        />
        <button className="neon-button" type="submit" disabled={isLoading}>
          {isLoading ? "연결중..." : "게임 입장"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </section>
  );
}

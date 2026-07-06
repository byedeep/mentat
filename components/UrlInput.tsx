"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UrlInputProps = {
  initialValue?: string;
  buttonLabel?: string;
};

export function UrlInput({ initialValue = "", buttonLabel = "Fetch" }: UrlInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();

    if (!nextValue) {
      setError("Enter a public API URL first.");
      return;
    }

    setError("");
    startTransition(() => {
      router.push(toViewerPath(nextValue));
    });
  }

  return (
    <section className="panel" aria-label="URL input">
      <form className="row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="api-url">
          API URL
        </label>
        <input
          id="api-url"
          className="input"
          placeholder="api.example.com/users?limit=10"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoCapitalize="none"
          autoComplete="url"
          autoCorrect="off"
          inputMode="url"
        />
        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Generating..." : buttonLabel}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function toViewerPath(input: string): string {
  let target = input.trim();

  if (typeof window !== "undefined") {
    const currentOrigin = `${window.location.origin}/`;

    if (target.startsWith(currentOrigin)) {
      target = target.slice(currentOrigin.length);
    }
  }

  target = target.replace(/^\/+/, "").replace(/\s/g, "%20");

  return target ? `/${target}` : "/";
}

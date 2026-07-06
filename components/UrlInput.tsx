"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UrlInputProps = {
  initialValue?: string;
};

export function UrlInput({ initialValue = "" }: UrlInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();

    if (!nextValue) {
      return;
    }

    startTransition(() => {
      router.push(toViewerPath(nextValue));
    });
  }

  return (
    <section className="url-panel" aria-label="URL input">
      <form className="url-form" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="https://api.example.com/users?limit=10"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="API endpoint"
          autoCapitalize="none"
          autoComplete="url"
          autoCorrect="off"
          disabled={isPending}
          inputMode="url"
          spellCheck={false}
        />
      </form>
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

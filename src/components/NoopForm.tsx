"use client";

import type { ComponentPropsWithoutRef, FormEvent } from "react";

function ignoreSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

/*
 * 아직 동작이 없는 폼. 제출해도 아무 일도 하지 않고 주소도 바뀌지 않는다.
 * (action 없는 폼은 GET 으로 제출되어 입력값이 주소창에 남기 때문에 막아 둔다.)
 * 실제 기능은 이후 단계에서 이 자리를 바꾼다.
 */
export default function NoopForm(props: ComponentPropsWithoutRef<"form">) {
  return <form {...props} onSubmit={ignoreSubmit} />;
}

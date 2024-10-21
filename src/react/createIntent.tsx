import { INTENT } from "../endpoints/Router";

export function createIntent<T extends string = string>() {
  function Intent({ value }: { value: T }) {
    return <input name={INTENT} value={value} type="hidden" />;
  }
  Intent.displayName = "Intent";

  return Intent;
}

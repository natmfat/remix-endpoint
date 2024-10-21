import { INTENT } from "../endpoints/Router";

interface IntentProps<T> {
  value: T;
}

export function Intent<T extends string = string>({ value }: IntentProps<T>) {
  return <input name={INTENT} value={value} type="hidden" />;
}

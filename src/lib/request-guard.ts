export function hasInvalidServerActionId(value: string | undefined) {
  return value !== undefined && !/^[a-f0-9]{40}$/.test(value);
}

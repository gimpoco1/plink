export function areSetsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

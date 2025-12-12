function hashToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function avatarStyleFor(id: string): { backgroundColor: string; color: string } {
  const hue = hashToHue(id);
  return { backgroundColor: `hsl(${hue} 32% 46%)`, color: "white" };
}


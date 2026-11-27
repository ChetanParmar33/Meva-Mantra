import { emblem } from '@/lib/art';

export function Emblem({ size = 48 }: { size?: number }) {
  return <span dangerouslySetInnerHTML={{ __html: emblem(size) }} />;
}

import { hammingDistance } from './perceptualHash';

const HASH_THRESHOLD = 10; // out of 64 bits; lower = stricter match
const TIME_WINDOW_SECONDS = 6; // burst frames are expected within this gap
const LOOKAHEAD = 6; // compare each photo to the next N in time order

export interface GroupablePhoto {
  hash?: bigint;
  captureTime?: Date | null;
}

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

/**
 * Clusters photos into "same burst / near-duplicate" groups using
 * perceptual-hash similarity, restricted to photos taken close together
 * in time. Returns a group id per input index (0-based, dense) plus each
 * group's member indices.
 */
export function groupPhotos(photos: GroupablePhoto[]): { groupId: number[]; groups: number[][] } {
  const n = photos.length;
  const uf = new UnionFind(n);

  const order = photos
    .map((_, i) => i)
    .sort((a, b) => {
      const ta = photos[a].captureTime?.getTime();
      const tb = photos[b].captureTime?.getTime();
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      return a - b;
    });

  for (let pos = 0; pos < order.length; pos++) {
    const i = order[pos];
    const photoI = photos[i];
    if (photoI.hash == null) continue;

    for (let lookahead = 1; lookahead <= LOOKAHEAD && pos + lookahead < order.length; lookahead++) {
      const j = order[pos + lookahead];
      const photoJ = photos[j];
      if (photoJ.hash == null) continue;

      if (photoI.captureTime && photoJ.captureTime) {
        const deltaSeconds = Math.abs(photoJ.captureTime.getTime() - photoI.captureTime.getTime()) / 1000;
        if (deltaSeconds > TIME_WINDOW_SECONDS) break; // sorted by time, later ones only farther away
      }

      if (hammingDistance(photoI.hash, photoJ.hash) <= HASH_THRESHOLD) {
        uf.union(i, j);
      }
    }
  }

  const rootToGroupId = new Map<number, number>();
  const groupId: number[] = new Array(n);
  const groups: number[][] = [];

  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    let id = rootToGroupId.get(root);
    if (id === undefined) {
      id = groups.length;
      rootToGroupId.set(root, id);
      groups.push([]);
    }
    groupId[i] = id;
    groups[id].push(i);
  }

  return { groupId, groups };
}

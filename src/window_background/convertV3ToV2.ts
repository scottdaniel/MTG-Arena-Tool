export default function convertV3ToV2(v3List): number[] {
  const ret = [];
  for (let i = 0; i < v3List.length; i += 2) {
    if (v3List[i + 1] > 0) {
      ret.push({ id: v3List[i], quantity: v3List[i + 1] });
    }
  }
  return ret;
}
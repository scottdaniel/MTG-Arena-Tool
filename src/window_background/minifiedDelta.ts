type DeltaValues = number[] | string[] | number | string;

// I dont use the original InventoryUpdate["delta"] type here because we
// access delta[key] below. Im not sure how to make that access legal for ts
// since InventoryUpdate.delta is an object and we convert to array with Object.keys.
interface InventoryDelta {
  [key: string]: DeltaValues;
}

// Given a shallow object of numbers and lists return a
// new object which doesn't contain 0s or empty lists.
export default function minifiedDelta(delta: InventoryDelta): InventoryDelta {
  const newDelta: InventoryDelta = {};
  Object.keys(delta).forEach((key: string) => {
    const val: DeltaValues = delta[key];
    if (val === 0 || (Array.isArray(val) && !val.length)) {
      return;
    }
    newDelta[key] = val;
  });
  return newDelta;
}

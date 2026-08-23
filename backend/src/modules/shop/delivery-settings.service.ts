import { getFreeShippingThresholdInPaise, getShippingFeeInPaise } from "../../lib/settings";

export async function getDeliverySettings() {
  const [freeShippingThresholdInPaise, shippingFeeInPaise] = await Promise.all([
    getFreeShippingThresholdInPaise(),
    getShippingFeeInPaise(),
  ]);
  return { freeShippingThresholdInPaise, shippingFeeInPaise };
}

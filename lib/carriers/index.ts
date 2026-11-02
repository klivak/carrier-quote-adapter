import type { CarrierForm, CarrierMapping } from "@/lib/types";
import harborForm from "./harbor/form.json";
import { harborMapping } from "./harbor/mapping";

export const harbor = { form: harborForm as CarrierForm, mapping: harborMapping } satisfies { form: CarrierForm; mapping: CarrierMapping };

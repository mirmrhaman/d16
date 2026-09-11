import React from "react";
import { servicesClient } from "@/api/servicesClient";
import CatalogueEditor from "./catalogue/CatalogueEditor";

export default function AdminServices() {
  return <CatalogueEditor client={servicesClient} queryKey="services" title="Services" singular="Service" route="Services" />;
}

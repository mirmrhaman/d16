import React from "react";
import { base44 } from "@/api/base44Client";
import CatalogueEditor from "./catalogue/CatalogueEditor";

export default function AdminPicYourConcept() {
  return <CatalogueEditor client={base44.entities.PicYourConcept} queryKey="picYourConcept" title="Pic Your Concept" singular="Concept" route="PicYourConcept" />;
}

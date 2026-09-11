import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CatalogueDetail from "./catalogue/CatalogueDetail";

export default function PicYourConceptDetail() {
  const { conceptSlug } = useParams();
  const { data: concepts = [], isLoading, error, refetch } = useQuery({ queryKey: ["picYourConcept"], queryFn: () => base44.entities.PicYourConcept.list("order") });
  const concept = concepts.find((item) => String(item.slug || item.id) === conceptSlug);
  return <CatalogueDetail item={concept} isLoading={isLoading} error={error} retry={refetch} catalogue="PicYourConcept" label="Concept" contextKey="concept" />;
}

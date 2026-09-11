import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { servicesClient } from "@/api/servicesClient";
import CatalogueDetail from "./catalogue/CatalogueDetail";

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export default function ServiceDetail() {
  const { serviceSlug } = useParams();
  const { data: services = [], isLoading, error, refetch } = useQuery({ queryKey: ["services"], queryFn: () => servicesClient.list() });
  const service = services.find((item) => slugify(item.slug || item.title) === serviceSlug);
  return <CatalogueDetail item={service} isLoading={isLoading} error={error} retry={refetch} catalogue="Services" label="Service" contextKey="service" />;
}

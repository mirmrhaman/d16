import React from "react";
import HeroSection from "../components/home/HeroSection";
import TaglineSection from "../components/home/TaglineSection";
import StatsSection from "../components/home/StatsSection";
import ValuesSection from "../components/home/ValuesSection";
import ServicesPreview from "../components/home/ServicesPreview";
import ProcessSection from "../components/home/ProcessSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <TaglineSection />
      <StatsSection />
      <ValuesSection />
      <ServicesPreview />
      <ProcessSection />
    </div>
  );
}

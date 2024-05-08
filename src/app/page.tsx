"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import HowToUse from "./HowToUse";
import StoreApiKey from "./StoreApiKey";

export default function Home() {
  return (
    <div className="h-[200vh]">
      <HowToUse />
      <StoreApiKey />
    </div>
  );
}

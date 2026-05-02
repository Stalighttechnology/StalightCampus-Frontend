import React, { createContext, useContext } from "react";

type BootstrapData = {
  branch_id?: string;
  semesters?: Array<{ id: string; number: number }>;
  sections?: Array<{ id: string; name: string; semester_id: string | null }>;
};

const HODBootstrapContext = createContext<BootstrapData | null>(null);

export const useHODBootstrap = () => useContext(HODBootstrapContext);

export const HODBootstrapProvider = ({ value, children }: { value: BootstrapData | null; children: React.ReactNode }) => {
  return <HODBootstrapContext.Provider value={value}>{children}</HODBootstrapContext.Provider>;
};



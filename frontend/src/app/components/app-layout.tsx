import React from "react";
import { Outlet } from "react-router";
import { AppHeader } from "./app-header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings, ChevronRight, FolderOpen } from "lucide-react";
import type { Blueprint } from "@/lib/types/blueprint";

interface SidebarNavProps {
  projects: Blueprint[];
}

export default function SidebarNav({ projects }: SidebarNavProps) {
  const pathname = usePathname();

  const isWorkspace = pathname === "/app";
  const activeProjectId = pathname.match(/\/app\/blueprints\/([^/]+)/)?.[1] ?? null;
  const isSettings = pathname.startsWith("/app/settings");

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      {/* Workspace */}
      <Link
        href="/app"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isWorkspace
            ? "bg-neutral-100 text-neutral-900"
            : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <LayoutDashboard className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        Workspace
      </Link>

      {/* Nested project list */}
      <div className="mt-1 ml-3 pl-3 border-l border-neutral-200 space-y-0.5">
        {projects.map((project) => {
          const isActive = activeProjectId === project.id;
          return (
            <Link
              key={project.id}
              href={`/app/blueprints/${project.id}`}
              className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg text-xs transition-colors group ${
                isActive
                  ? "bg-primary-50 text-primary-700 font-semibold"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 font-medium"
              }`}
              title={project.title}
            >
              <FolderOpen className={`w-3 h-3 flex-shrink-0 ${isActive ? "text-primary-500" : "text-neutral-400"}`} />
              <span className="truncate flex-1">{project.title}</span>
              {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 text-primary-400" />}
            </Link>
          );
        })}

        {projects.length === 0 && (
          <p className="pl-2 py-1.5 text-xs text-neutral-400 italic">No projects yet</p>
        )}
      </div>

      {/* Settings */}
      <Link
        href="/app/settings"
        className={`mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isSettings
            ? "bg-neutral-100 text-neutral-900"
            : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <Settings className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        Settings
      </Link>
    </nav>
  );
}

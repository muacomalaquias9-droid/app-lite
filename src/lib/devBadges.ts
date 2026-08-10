// Pack de selos de programador (logos de linguagens, senioridade e empresa).
// Usados no perfil, abaixo do botão "Editar perfil".

export const DEV_USER_ID = "9bab2680-3e01-49d3-b100-50fa52b2ea77";
export const DEV_EMAIL = "isaacmuaco582@gmail.com";

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

export interface DevBadge {
  id: string;
  label: string;
  icon: string;
  group: "Linguagens" | "Nível" | "Empresa";
}

export const DEV_BADGES: DevBadge[] = [
  { id: "typescript", label: "TypeScript", icon: `${DEVICON}/typescript/typescript-original.svg`, group: "Linguagens" },
  { id: "javascript", label: "JavaScript", icon: `${DEVICON}/javascript/javascript-original.svg`, group: "Linguagens" },
  { id: "react", label: "React", icon: `${DEVICON}/react/react-original.svg`, group: "Linguagens" },
  { id: "python", label: "Python", icon: `${DEVICON}/python/python-original.svg`, group: "Linguagens" },
  { id: "java", label: "Java", icon: `${DEVICON}/java/java-original.svg`, group: "Linguagens" },
  { id: "kotlin", label: "Kotlin", icon: `${DEVICON}/kotlin/kotlin-original.svg`, group: "Linguagens" },
  { id: "swift", label: "Swift", icon: `${DEVICON}/swift/swift-original.svg`, group: "Linguagens" },
  { id: "php", label: "PHP", icon: `${DEVICON}/php/php-original.svg`, group: "Linguagens" },
  { id: "csharp", label: "C#", icon: `${DEVICON}/csharp/csharp-original.svg`, group: "Linguagens" },
  { id: "cplusplus", label: "C++", icon: `${DEVICON}/cplusplus/cplusplus-original.svg`, group: "Linguagens" },
  { id: "go", label: "Go", icon: `${DEVICON}/go/go-original-logo.svg`, group: "Linguagens" },
  { id: "rust", label: "Rust", icon: `${DEVICON}/rust/rust-original.svg`, group: "Linguagens" },
  { id: "nodejs", label: "Node.js", icon: `${DEVICON}/nodejs/nodejs-original.svg`, group: "Linguagens" },
  { id: "postgresql", label: "PostgreSQL", icon: `${DEVICON}/postgresql/postgresql-original.svg`, group: "Linguagens" },
  { id: "supabase", label: "Supabase", icon: `${DEVICON}/supabase/supabase-original.svg`, group: "Linguagens" },
  { id: "flutter", label: "Flutter", icon: `${DEVICON}/flutter/flutter-original.svg`, group: "Linguagens" },
  { id: "tailwind", label: "Tailwind", icon: `${DEVICON}/tailwindcss/tailwindcss-original.svg`, group: "Linguagens" },
  { id: "git", label: "Git", icon: `${DEVICON}/git/git-original.svg`, group: "Linguagens" },
  { id: "docker", label: "Docker", icon: `${DEVICON}/docker/docker-original.svg`, group: "Linguagens" },
  { id: "linux", label: "Linux", icon: `${DEVICON}/linux/linux-original.svg`, group: "Linguagens" },
  { id: "junior", label: "Junior Dev", icon: `${DEVICON}/devicon/devicon-original.svg`, group: "Nível" },
  { id: "senior", label: "Sénior Dev", icon: `${DEVICON}/vscode/vscode-original.svg`, group: "Nível" },
  { id: "fullstack", label: "Full-Stack", icon: `${DEVICON}/nestjs/nestjs-original.svg`, group: "Nível" },
  { id: "company", label: "Blynk Company", icon: `${DEVICON}/googlecloud/googlecloud-original.svg`, group: "Empresa" },
  { id: "founder", label: "Founder", icon: `${DEVICON}/apple/apple-original.svg`, group: "Empresa" },
  { id: "engineer", label: "Engenheiro de Software", icon: `${DEVICON}/android/android-original.svg`, group: "Empresa" },
];

export const DEV_BADGE_MAP: Record<string, DevBadge> = DEV_BADGES.reduce(
  (acc, b) => ({ ...acc, [b.id]: b }),
  {} as Record<string, DevBadge>
);

export const DEV_BADGE_GROUPS = ["Linguagens", "Nível", "Empresa"] as const;

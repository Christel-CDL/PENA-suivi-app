import { suiteValide } from "@/lib/auth/suite";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return <LoginForm suite={suiteValide(suite)} />;
}

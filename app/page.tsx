import { HomeTabs } from "@/components/HomeTabs";
import { SideNav } from "@/components/SideNav";

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <SideNav />
      <HomeTabs />
    </main>
  );
}

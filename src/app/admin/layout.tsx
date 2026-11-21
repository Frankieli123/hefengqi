import { NotoSansScStyles } from "@/components/noto-sans-sc-styles";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><NotoSansScStyles weights={[400, 500, 600]} />{children}</>;
}

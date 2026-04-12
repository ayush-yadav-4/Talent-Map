import { HrAppLayout } from "@/components/hr/HrAppLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <HrAppLayout>{children}</HrAppLayout>
    </QueryProvider>
  );
}

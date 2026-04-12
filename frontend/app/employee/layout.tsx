import { EmployeeAppLayout } from "@/components/employee/EmployeeAppLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <EmployeeAppLayout>{children}</EmployeeAppLayout>
    </QueryProvider>
  );
}

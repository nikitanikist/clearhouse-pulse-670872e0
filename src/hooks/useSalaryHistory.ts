import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SalaryHistoryRow } from "@/types/database";

export const useSalaryHistory = (employeeId: string) =>
  useQuery({
    queryKey: ["salary-history", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<SalaryHistoryRow[]> => {
      const { data, error } = await supabase
        .from("salary_history")
        .select("*")
        .eq("employee_id", employeeId)
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SalaryHistoryRow[];
    },
  });

export const CURRENCIES = ["CAD", "USD", "INR", "EUR", "GBP"] as const;

export const formatSalary = (amount: number, currency: string) =>
  `${new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;

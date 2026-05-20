import { Info, Loader2 } from "lucide-react";
import { useEmployeeInterpersonal } from "@/hooks/useEmployees";

const InterpersonalSkills = ({ employeeId }: { employeeId: string }) => {
  const { data: skills = [], isLoading } = useEmployeeInterpersonal(employeeId);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
        <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
        <p className="text-sm text-[#0072BC]/80">
          This section is entered manually by the manager based on their direct observations and feedback.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading interpersonal assessments…
        </div>
      ) : skills.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No interpersonal assessments recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div key={s.id} className="bg-card rounded-lg border border-border shadow-sm p-5">
              <h4 className="text-sm font-heading font-bold text-foreground mb-2">{s.skill_area}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.assessment_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterpersonalSkills;

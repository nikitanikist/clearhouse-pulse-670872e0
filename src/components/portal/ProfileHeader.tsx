import { MapPin, Briefcase, Building2 } from "lucide-react";
import type { Employee } from "@/data/employees";

const ProfileHeader = ({ employee }: { employee: Employee }) => (
  <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-lg flex-shrink-0">
      {employee.initials}
    </div>
    <div className="min-w-0">
      <h2 className="text-xl font-heading font-bold text-foreground">
        {employee.name}
        {employee.isActive === false && (
          <span className="ml-2 inline-block align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            Inactive
          </span>
        )}
      </h2>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-0.5">
        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{employee.position}</span>
        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{employee.department}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{employee.location}</span>
      </div>
    </div>
  </div>
);

export default ProfileHeader;

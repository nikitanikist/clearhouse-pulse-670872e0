import { Mail, Phone, User, Calendar, Building2, MapPin, Briefcase, Users } from "lucide-react";
import type { Employee } from "@/data/employees";

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const EmployeeProfile = ({ employee }: { employee: Employee }) => (
  <div className="bg-card rounded-lg shadow-sm border border-border p-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl">
        {employee.initials}
      </div>
      <div>
        <h3 className="text-lg font-heading font-bold text-foreground">{employee.name}</h3>
        <p className="text-sm text-muted-foreground">{employee.position} · {employee.department}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 divide-y md:divide-y-0">
      <div className="space-y-0 divide-y divide-border">
        <Field icon={User} label="Full Name" value={employee.name} />
        <Field icon={Briefcase} label="Position" value={employee.position} />
        <Field icon={Building2} label="Department" value={employee.department} />
        <Field icon={MapPin} label="Location" value={employee.location} />
        <Field icon={Calendar} label="Tenure with Firm" value={employee.tenure} />
      </div>
      <div className="space-y-0 divide-y divide-border">
        <Field icon={Calendar} label="Tenure in Current Role" value={employee.tenureInRole} />
        <Field icon={Users} label="Supervisor / Manager" value={employee.supervisor} />
        <Field icon={Mail} label="Email" value={employee.email} />
        <Field icon={Phone} label="Phone" value={employee.phone} />
      </div>
    </div>
  </div>
);

export default EmployeeProfile;

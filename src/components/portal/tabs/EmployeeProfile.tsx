import { useEffect, useState } from "react";
import { Mail, Phone, User, Calendar, Building2, MapPin, Briefcase, Users, Pencil, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import type { Employee, Position, Department, Location } from "@/data/employees";

const positions: Position[] = ["Partner", "Manager", "Senior Associate", "Intermediate", "Associate", "Operations"];
const departments: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];
const locations: Location[] = ["Canada", "India"];

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const EmployeeProfile = ({ employee }: { employee: Employee }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(employee);
  const [form, setForm] = useState({
    name: employee.name,
    position: employee.position,
    department: employee.department,
    location: employee.location,
    tenure_with_firm: employee.tenure,
    tenure_in_role: employee.tenureInRole,
    supervisor: employee.supervisor,
    email: employee.email,
    phone: employee.phone,
  });

  useEffect(() => {
    setLocal(employee);
    setForm({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      location: employee.location,
      tenure_with_firm: employee.tenure,
      tenure_in_role: employee.tenureInRole,
      supervisor: employee.supervisor,
      email: employee.email,
      phone: employee.phone,
    });
  }, [employee]);

  const cancel = () => {
    setForm({
      name: local.name,
      position: local.position,
      department: local.department,
      location: local.location,
      tenure_with_firm: local.tenure,
      tenure_in_role: local.tenureInRole,
      supervisor: local.supervisor,
      email: local.email,
      phone: local.phone,
    });
    setEditing(false);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({
        name: form.name.trim(),
        position: form.position,
        department: form.department,
        location: form.location,
        tenure_with_firm: form.tenure_with_firm,
        tenure_in_role: form.tenure_in_role,
        supervisor: form.supervisor,
        email: form.email,
        phone: form.phone,
      } as never)
      .eq("id", employee.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLocal({
      ...local,
      name: form.name.trim(),
      position: form.position,
      department: form.department,
      location: form.location,
      tenure: form.tenure_with_firm,
      tenureInRole: form.tenure_in_role,
      supervisor: form.supervisor,
      email: form.email,
      phone: form.phone,
    });
    setEditing(false);
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["employee", employee.id] });
  };

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";
  const selectCls = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl">
            {local.initials}
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-foreground">{local.name}</h3>
            <p className="text-sm text-muted-foreground">{local.position} · {local.department}</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Position</label>
              <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as Position })} className={selectCls}>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })} className={selectCls}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as Location })} className={selectCls}>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tenure with Firm</label>
              <Input value={form.tenure_with_firm} onChange={(e) => setForm({ ...form, tenure_with_firm: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tenure in Current Role</label>
              <Input value={form.tenure_in_role} onChange={(e) => setForm({ ...form, tenure_in_role: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Supervisor / Manager</label>
              <Input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={cancel}
              disabled={saving}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 divide-y md:divide-y-0">
          <div className="space-y-0 divide-y divide-border">
            <Field icon={User} label="Full Name" value={local.name} />
            <Field icon={Briefcase} label="Position" value={local.position} />
            <Field icon={Building2} label="Department" value={local.department} />
            <Field icon={MapPin} label="Location" value={local.location} />
            <Field icon={Calendar} label="Tenure with Firm" value={local.tenure} />
          </div>
          <div className="space-y-0 divide-y divide-border">
            <Field icon={Calendar} label="Tenure in Current Role" value={local.tenureInRole} />
            <Field icon={Users} label="Supervisor / Manager" value={local.supervisor} />
            <Field icon={Mail} label="Email" value={local.email} />
            <Field icon={Phone} label="Phone" value={local.phone} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;

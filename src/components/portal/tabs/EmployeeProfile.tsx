import { useEffect, useState } from "react";
import { Mail, Phone, User, Calendar, Building2, MapPin, Briefcase, Users, Pencil, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Employee, Position, Department, Location } from "@/data/employees";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartmentNames, usePositionNames } from "@/hooks/useLookups";
import SupervisorCombobox from "../SupervisorCombobox";
import { formatTenure, formatDateLong } from "@/lib/tenure";
import SalaryCard from "./SalaryCard";


const locations: Location[] = ["Canada", "India"];

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  </div>
);

const EmployeeProfile = ({ employee }: { employee: Employee }) => {
  const { names: positions } = usePositionNames();
  const { names: departments } = useDepartmentNames();
  const queryClient = useQueryClient();
  const { data: allEmployees = [] } = useEmployees();
  const permissions = usePermissions();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [local, setLocal] = useState(employee);

  const buildInitialForm = (e: Employee) => ({
    name: e.name,
    position: e.position,
    department: e.department,
    location: e.location,
    joining_date: e.joiningDate ?? "",
    role_start_date: e.roleStartDate ?? "",
    supervisor: e.supervisor,
    email: e.email,
    phone: e.phone,
  });
  const [form, setForm] = useState(buildInitialForm(employee));
  const [baseline, setBaseline] = useState(buildInitialForm(employee));

  useEffect(() => {
    setLocal(employee);
    const next = buildInitialForm(employee);
    setForm(next);
    setBaseline(next);
  }, [employee]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const requestCancel = () => {
    if (isDirty) setConfirmDiscard(true);
    else discard();
  };
  const discard = () => {
    setForm(baseline);
    setConfirmDiscard(false);
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
        joining_date: form.joining_date || null,
        role_start_date: form.role_start_date || null,
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
      joiningDate: form.joining_date || null,
      roleStartDate: form.role_start_date || null,
      supervisor: form.supervisor,
      email: form.email,
      phone: form.phone,
    });
    setBaseline(form);
    setEditing(false);
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["employee", employee.id] });
  };

  const labelCls = "text-xs font-medium text-muted-foreground";
  const selectCls = "mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const tenureDisplay = formatTenure(local.joiningDate, local.tenure);
  const roleTenureDisplay = formatTenure(local.roleStartDate, local.tenureInRole);

  return (
    <>
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
        {!editing && permissions.can_edit_profile && (
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
              <Label htmlFor="ep-name" className={labelCls}>Full Name *</Label>
              <Input id="ep-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ep-position" className={labelCls}>Position *</Label>
              <select id="ep-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as Position })} className={selectCls}>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ep-department" className={labelCls}>Department *</Label>
              <select id="ep-department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })} className={selectCls}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ep-location" className={labelCls}>Location *</Label>
              <select id="ep-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as Location })} className={selectCls}>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ep-joining-date" className={labelCls}>Joining Date</Label>
              <Input id="ep-joining-date" type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ep-role-start" className={labelCls}>Role Start Date</Label>
              <Input id="ep-role-start" type="date" value={form.role_start_date} onChange={(e) => setForm({ ...form, role_start_date: e.target.value })} className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ep-supervisor" className={labelCls}>Supervisor / Manager</Label>
              <SupervisorCombobox
                id="ep-supervisor"
                value={form.supervisor}
                onChange={(v) => setForm({ ...form, supervisor: v })}
                employees={allEmployees}
                excludeId={employee.id}
              />
            </div>
            <div>
              <Label htmlFor="ep-email" className={labelCls}>Email</Label>
              <Input id="ep-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ep-phone" className={labelCls}>Phone</Label>
              <Input id="ep-phone" type="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={requestCancel}
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

          <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved edits to this profile. Closing now will lose them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction onClick={discard}>Discard</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 divide-y md:divide-y-0">
          <div className="space-y-0 divide-y divide-border">
            <Field icon={User} label="Full Name" value={local.name} />
            <Field icon={Briefcase} label="Position" value={local.position} />
            <Field icon={Building2} label="Department" value={local.department} />
            <Field icon={MapPin} label="Location" value={local.location} />
            {local.joiningDate && (
              <Field icon={Calendar} label="Joining Date" value={formatDateLong(local.joiningDate)} />
            )}
            <Field icon={Calendar} label="Tenure with Firm" value={tenureDisplay} />
          </div>
          <div className="space-y-0 divide-y divide-border">
            {local.roleStartDate && (
              <Field icon={Calendar} label="Role Start Date" value={formatDateLong(local.roleStartDate)} />
            )}
            <Field icon={Calendar} label="Tenure in Current Role" value={roleTenureDisplay} />
            <Field icon={Users} label="Supervisor / Manager" value={local.supervisor} />
            <Field icon={Mail} label="Email" value={local.email} />
            <Field icon={Phone} label="Phone" value={local.phone} />
          </div>
        </div>
      )}
    </div>
    <SalaryCard employeeId={employee.id} employeeName={local.name} />
    </>
  );

};

export default EmployeeProfile;

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

interface Skill {
  name: string;
  level: SkillLevel;
  checked: boolean;
}

const levelVariant: Record<SkillLevel, "default" | "secondary" | "outline"> = {
  Advanced: "default",
  Intermediate: "secondary",
  Beginner: "outline",
};

const accountingSkills: Skill[] = [
  { name: "Bookkeeping", level: "Advanced", checked: true },
  { name: "Year-End Prep", level: "Advanced", checked: true },
  { name: "Personal Tax", level: "Intermediate", checked: true },
  { name: "Corporate Tax", level: "Intermediate", checked: false },
  { name: "Compilation Support", level: "Advanced", checked: true },
];

const softwareSkills: Skill[] = [
  { name: "QuickBooks Online", level: "Advanced", checked: true },
  { name: "QuickBooks Desktop", level: "Intermediate", checked: true },
  { name: "Excel", level: "Advanced", checked: true },
];

const SkillRow = ({ skill }: { skill: Skill }) => (
  <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
    <Checkbox checked={skill.checked} disabled className="pointer-events-none" />
    <span className="text-sm font-medium text-foreground flex-1">{skill.name}</span>
    <Badge variant={levelVariant[skill.level]}>{skill.level}</Badge>
  </div>
);

const TechnicalCompetencies = () => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Accounting Skills</h3>
        {accountingSkills.map((s) => <SkillRow key={s.name} skill={s} />)}
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Software Proficiency</h3>
        {softwareSkills.map((s) => <SkillRow key={s.name} skill={s} />)}
      </div>
    </div>
  );
};

export default TechnicalCompetencies;

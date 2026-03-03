import { Checkbox } from "@/components/ui/checkbox";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

interface Skill {
  name: string;
  level: SkillLevel;
}

const allLevels: SkillLevel[] = ["Beginner", "Intermediate", "Advanced"];

const accountingSkills: Skill[] = [
  { name: "Bookkeeping", level: "Advanced" },
  { name: "Year-End Prep", level: "Advanced" },
  { name: "Personal Tax", level: "Intermediate" },
  { name: "Corporate Tax", level: "Intermediate" },
  { name: "Compilation Support", level: "Advanced" },
];

const softwareSkills: Skill[] = [
  { name: "QuickBooks Online", level: "Advanced" },
  { name: "QuickBooks Desktop", level: "Intermediate" },
  { name: "Excel", level: "Advanced" },
];

const SkillRow = ({ skill }: { skill: Skill }) => (
  <li className="flex items-center gap-2 py-2">
    <span className="text-sm font-medium text-foreground min-w-[160px]">{skill.name}:</span>
    <div className="flex items-center gap-4">
      {allLevels.map((level) => (
        <label key={level} className="flex items-center gap-1.5 cursor-default">
          <Checkbox checked={skill.level === level} disabled className="pointer-events-none" />
          <span className="text-sm text-muted-foreground">{level}</span>
        </label>
      ))}
    </div>
  </li>
);

const TechnicalCompetencies = () => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Accounting Skills</h3>
        <ul className="space-y-0.5">
          {accountingSkills.map((s) => <SkillRow key={s.name} skill={s} />)}
        </ul>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Software Proficiency</h3>
        <ul className="space-y-0.5">
          {softwareSkills.map((s) => <SkillRow key={s.name} skill={s} />)}
        </ul>
      </div>
    </div>
  );
};

export default TechnicalCompetencies;

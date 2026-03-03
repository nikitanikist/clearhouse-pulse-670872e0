import { useEffect, useState } from "react";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

interface Skill {
  name: string;
  level: SkillLevel;
}

const levelConfig: Record<SkillLevel, { percent: number; color: string }> = {
  Beginner: { percent: 33, color: "bg-orange-400" },
  Intermediate: { percent: 66, color: "bg-secondary" },
  Advanced: { percent: 100, color: "bg-primary" },
};

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

const SkillBar = ({ skill, animate }: { skill: Skill; animate: boolean }) => {
  const config = levelConfig[skill.level];
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="text-sm font-medium text-foreground w-40 flex-shrink-0">{skill.name}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${config.color} transition-all duration-700 ease-out`}
          style={{ width: animate ? `${config.percent}%` : "0%" }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-24 text-right">{skill.level}</span>
    </div>
  );
};

const TechnicalCompetencies = () => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Accounting Skills</h3>
        <div className="divide-y divide-border">
          {accountingSkills.map((s) => <SkillBar key={s.name} skill={s} animate={animate} />)}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Software Proficiency</h3>
        <div className="divide-y divide-border">
          {softwareSkills.map((s) => <SkillBar key={s.name} skill={s} animate={animate} />)}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCompetencies;

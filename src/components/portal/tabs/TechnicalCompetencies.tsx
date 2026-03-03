import { useState } from "react";
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

interface SkillCategoryProps {
  title: string;
  skills: Skill[];
  noteKey: string;
  notes: Record<string, string>;
  onNoteChange: (key: string, value: string) => void;
}

const SkillCategory = ({ title, skills, noteKey, notes, onNoteChange }: SkillCategoryProps) => (
  <div className="bg-card rounded-lg border border-border shadow-sm p-6">
    <h3 className="text-base font-heading font-bold text-foreground mb-3">{title}</h3>
    <ul className="space-y-0.5">
      {skills.map((s) => <SkillRow key={s.name} skill={s} />)}
    </ul>
    <div className="mt-4">
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Additional Notes</label>
      <textarea
        value={notes[noteKey] || ""}
        onChange={(e) => onNoteChange(noteKey, e.target.value)}
        placeholder={`Add notes about ${title.toLowerCase()}...`}
        className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        rows={3}
      />
    </div>
  </div>
);

const TechnicalCompetencies = () => {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleNoteChange = (key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <SkillCategory title="Accounting Skills" skills={accountingSkills} noteKey="accounting" notes={notes} onNoteChange={handleNoteChange} />
      <SkillCategory title="Software Proficiency" skills={softwareSkills} noteKey="software" notes={notes} onNoteChange={handleNoteChange} />
    </div>
  );
};

export default TechnicalCompetencies;

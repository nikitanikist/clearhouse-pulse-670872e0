import { Info } from "lucide-react";

const skills = [
  { name: "Client Communication", text: "Priya communicates clearly and professionally with clients. She is known for translating complex accounting concepts into understandable language for business owners." },
  { name: "Team Collaboration", text: "Actively supports team members during busy season. Frequently volunteers to help peers with overflow work." },
  { name: "Adaptability", text: "Adjusted well to the firm's transition to remote work. Quick to adopt new tools and processes." },
  { name: "Problem-Solving", text: "Strong analytical thinker. Proactively identifies potential issues in engagement files before they escalate." },
  { name: "Initiative", text: "Proposed and implemented a new client onboarding checklist that reduced setup time by 20%." },
  { name: "Commitment to Firm Values", text: "Consistently demonstrates integrity, professionalism, and a client-first mindset in all interactions." },
  { name: "Dependability During Peak Seasons", text: "Highly dependable. Available for extended hours during tax season without decline in work quality." },
  { name: "Support for Team Members", text: "Acts as an informal mentor to newer associates. Regularly conducts knowledge-sharing sessions." },
  { name: "Contributions to Firm Culture", text: "Organizes monthly team socials. Participated in the firm's community volunteering initiative." },
];

const InterpersonalSkills = () => (
  <div className="space-y-4">
    {/* Info Banner */}
    <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
      <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
      <p className="text-sm text-[#0072BC]/80">
        This section is entered manually by the manager based on their direct observations and feedback.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((s) => (
        <div key={s.name} className="bg-card rounded-lg border border-border shadow-sm p-5">
          <h4 className="text-sm font-heading font-bold text-foreground mb-2">{s.name}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
        </div>
      ))}
    </div>
  </div>
);

export default InterpersonalSkills;

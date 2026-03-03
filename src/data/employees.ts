export type PotentialRating = "High" | "Medium" | "Developing";
export type Department = "Assurance" | "Tax" | "Advisory" | "Operations";
export type Location = "Canada" | "India";
export type Position = "Partner" | "Manager" | "Senior Associate" | "Intermediate" | "Associate" | "Operations";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  position: Position;
  department: Department;
  location: Location;
  potential: PotentialRating;
  email: string;
  phone: string;
  tenure: string;
  tenureInRole: string;
  supervisor: string;
  currentYearRating: number;
  previousYearRating: number;
  bffSummary: string;
}

export const employees: Employee[] = [
  {
    id: "1",
    name: "Priya Sharma",
    initials: "PS",
    position: "Senior Associate",
    department: "Assurance",
    location: "Canada",
    potential: "High",
    email: "priya.sharma@clearhouse.ca",
    phone: "(647) 555-0192",
    tenure: "4 years, 3 months",
    tenureInRole: "1 year, 8 months",
    supervisor: "David Chen (Manager)",
    currentYearRating: 4.2,
    previousYearRating: 3.8,
    bffSummary: "Priya envisions growing into a managerial role within the Assurance practice, eventually leading a team of 5-8 associates. She is passionate about process improvement and wants to develop expertise in IFRS advisory.",
  },
  {
    id: "2",
    name: "Arun Patel",
    initials: "AP",
    position: "Associate",
    department: "Tax",
    location: "India",
    potential: "Medium",
    email: "arun.patel@clearhouse.ca",
    phone: "+91 98765 43210",
    tenure: "2 years, 1 month",
    tenureInRole: "2 years, 1 month",
    supervisor: "Michael Roberts (Manager)",
    currentYearRating: 3.5,
    previousYearRating: 3.2,
    bffSummary: "Arun aims to specialize in international tax compliance, particularly cross-border Canada-India transactions. He sees himself as a tax advisory specialist within 3 years.",
  },
  {
    id: "3",
    name: "David Chen",
    initials: "DC",
    position: "Manager",
    department: "Assurance",
    location: "Canada",
    potential: "High",
    email: "david.chen@clearhouse.ca",
    phone: "(905) 555-0147",
    tenure: "8 years, 6 months",
    tenureInRole: "3 years, 2 months",
    supervisor: "Sarb Clearhouse (Partner)",
    currentYearRating: 4.6,
    previousYearRating: 4.4,
    bffSummary: "David aspires to become a Partner within 5 years, focusing on growing the firm's mid-market assurance practice and mentoring the next generation of managers.",
  },
  {
    id: "4",
    name: "Emily Tremblay",
    initials: "ET",
    position: "Intermediate",
    department: "Advisory",
    location: "Canada",
    potential: "Developing",
    email: "emily.tremblay@clearhouse.ca",
    phone: "(416) 555-0283",
    tenure: "1 year, 9 months",
    tenureInRole: "1 year, 9 months",
    supervisor: "David Chen (Manager)",
    currentYearRating: 2.8,
    previousYearRating: 2.5,
    bffSummary: "Emily is exploring whether she wants to pursue advisory consulting or move toward a project management role. She values variety in her work assignments.",
  },
  {
    id: "5",
    name: "Gurpreet Dhillon",
    initials: "GD",
    position: "Senior Associate",
    department: "Tax",
    location: "Canada",
    potential: "High",
    email: "gurpreet.dhillon@clearhouse.ca",
    phone: "(647) 555-0371",
    tenure: "5 years, 0 months",
    tenureInRole: "2 years, 4 months",
    supervisor: "Michael Roberts (Manager)",
    currentYearRating: 4.0,
    previousYearRating: 3.6,
    bffSummary: "Gurpreet wants to become a recognized tax specialist, eventually leading the firm's corporate tax practice and developing expertise in tax planning for owner-managed businesses.",
  },
  {
    id: "6",
    name: "Riya Kapoor",
    initials: "RK",
    position: "Associate",
    department: "Assurance",
    location: "India",
    potential: "Medium",
    email: "riya.kapoor@clearhouse.ca",
    phone: "+91 99887 76655",
    tenure: "1 year, 5 months",
    tenureInRole: "1 year, 5 months",
    supervisor: "David Chen (Manager)",
    currentYearRating: 3.4,
    previousYearRating: 3.0,
    bffSummary: "Riya sees herself growing within assurance, with a particular interest in technology audits and data analytics. She wants to bridge accounting and tech.",
  },
  {
    id: "7",
    name: "Michael Roberts",
    initials: "MR",
    position: "Manager",
    department: "Tax",
    location: "Canada",
    potential: "High",
    email: "michael.roberts@clearhouse.ca",
    phone: "(905) 555-0492",
    tenure: "10 years, 2 months",
    tenureInRole: "4 years, 7 months",
    supervisor: "Sarb Clearhouse (Partner)",
    currentYearRating: 4.5,
    previousYearRating: 4.3,
    bffSummary: "Michael aims to expand the tax department's service offerings into US cross-border tax and estate planning. He envisions building a team of 10+ dedicated tax professionals.",
  },
  {
    id: "8",
    name: "Anita Desai",
    initials: "AD",
    position: "Intermediate",
    department: "Operations",
    location: "India",
    potential: "Medium",
    email: "anita.desai@clearhouse.ca",
    phone: "+91 98765 11223",
    tenure: "3 years, 0 months",
    tenureInRole: "1 year, 2 months",
    supervisor: "Michael Roberts (Manager)",
    currentYearRating: 3.3,
    previousYearRating: 3.1,
    bffSummary: "Anita wants to streamline the firm's internal operations and eventually lead the operations department. She is passionate about process automation and efficiency.",
  },
  {
    id: "9",
    name: "James Wilson",
    initials: "JW",
    position: "Associate",
    department: "Advisory",
    location: "Canada",
    potential: "Developing",
    email: "james.wilson@clearhouse.ca",
    phone: "(416) 555-0518",
    tenure: "0 years, 10 months",
    tenureInRole: "0 years, 10 months",
    supervisor: "David Chen (Manager)",
    currentYearRating: 2.9,
    previousYearRating: 2.6,
    bffSummary: "James is still exploring his career path but is drawn to advisory work, particularly business valuations and due diligence engagements.",
  },
  {
    id: "10",
    name: "Neha Malhotra",
    initials: "NM",
    position: "Senior Associate",
    department: "Tax",
    location: "India",
    potential: "High",
    email: "neha.malhotra@clearhouse.ca",
    phone: "+91 99001 22334",
    tenure: "6 years, 1 month",
    tenureInRole: "2 years, 9 months",
    supervisor: "Michael Roberts (Manager)",
    currentYearRating: 4.1,
    previousYearRating: 3.9,
    bffSummary: "Neha aspires to become a senior tax manager specializing in corporate restructuring and M&A tax advisory. She wants to lead cross-border engagements between Canada and India.",
  },
];

export const departmentColors: Record<Department, string> = {
  Assurance: "bg-primary/15 text-primary",
  Tax: "bg-success/15 text-success",
  Advisory: "bg-warning/15 text-warning",
  Operations: "bg-secondary/15 text-secondary",
};

export const potentialColors: Record<PotentialRating, string> = {
  High: "bg-success",
  Medium: "bg-warning",
  Developing: "bg-orange-400",
};

export type SecurityLevel = 1 | 2 | 3 | 4 | 5;

const hiddenPositionsByLevel: Record<SecurityLevel, Position[]> = {
  1: [],
  2: ["Partner"],
  3: ["Partner", "Manager"],
  4: ["Partner", "Manager", "Senior Associate"],
  5: ["Partner", "Manager", "Senior Associate", "Intermediate", "Associate"],
};

export function filterBySecurityLevel(emps: Employee[], level: SecurityLevel): Employee[] {
  if (level === 5) {
    return emps.filter((e) => e.department === "Operations");
  }
  const hidden = hiddenPositionsByLevel[level];
  return emps.filter((e) => !hidden.includes(e.position));
}

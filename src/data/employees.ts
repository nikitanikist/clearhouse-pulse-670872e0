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

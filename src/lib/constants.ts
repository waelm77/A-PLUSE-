import {
  BookOpen, Atom, Dna, Heart, FlaskConical, Beaker, Microscope, Brain,
} from "lucide-react";

export const AVAILABLE_ICONS = [
  { name: "BookOpen", icon: BookOpen },
  { name: "Atom", icon: Atom },
  { name: "Dna", icon: Dna },
  { name: "Heart", icon: Heart },
  { name: "FlaskConical", icon: FlaskConical },
  { name: "Beaker", icon: Beaker },
  { name: "Microscope", icon: Microscope },
  { name: "Brain", icon: Brain },
];

export const COLORS = [
  "#00BCD4", "#3F51B5", "#E91E63", "#F44336",
  "#4CAF50", "#FF9800", "#9C27B0", "#2196F3",
];

export const iconMap = Object.fromEntries(
  AVAILABLE_ICONS.map(({ name, icon }) => [name, icon])
);

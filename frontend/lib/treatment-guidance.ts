export type TreatmentSections = {
  immediate: string;
  next: string;
  monitor: string;
};

const EMPTY_TREATMENT: TreatmentSections = {
  immediate: "",
  next: "",
  monitor: ""
};

export function parseTreatmentSections(text: string | null | undefined): TreatmentSections {
  if (!text) {
    return EMPTY_TREATMENT;
  }

  const sections = {...EMPTY_TREATMENT};
  for (const line of text.split(/\n+/g).map((part) => part.trim()).filter(Boolean)) {
    const [label, ...rest] = line.split(":");
    const body = rest.join(":").trim();
    const normalized = label.toLowerCase();
    if (normalized.startsWith("immediate")) {
      sections.immediate = body;
    } else if (normalized.startsWith("next")) {
      sections.next = body;
    } else if (normalized.startsWith("monitor")) {
      sections.monitor = body;
    }
  }

  return sections;
}

export function hasHealthyLabel(label: string | null | undefined): boolean {
  return label?.toLowerCase().includes("healthy") ?? false;
}

export function summarizeTreatment(text: string | null | undefined): string {
  const sections = parseTreatmentSections(text);
  return sections.immediate || sections.next || sections.monitor || "";
}
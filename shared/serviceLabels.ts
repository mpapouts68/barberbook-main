/** Service row shape from API (Greek primary + optional English) */
export type LocalizedService = {
  name: string;
  description?: string | null;
  nameEn?: string | null;
  descriptionEn?: string | null;
};

export function getServiceName(service: LocalizedService, isEnglish: boolean): string {
  if (isEnglish && service.nameEn?.trim()) {
    return service.nameEn.trim();
  }
  return service.name;
}

export function getServiceDescription(
  service: LocalizedService,
  isEnglish: boolean,
): string {
  if (isEnglish && service.descriptionEn?.trim()) {
    return service.descriptionEn.trim();
  }
  return service.description?.trim() || "";
}

export function getServiceLabel(
  service: LocalizedService,
  isEnglish: boolean,
  options?: { includeDescription?: boolean; suffix?: string },
): string {
  const name = getServiceName(service, isEnglish);
  const desc = getServiceDescription(service, isEnglish);
  const suffix = options?.suffix ?? "";
  if (options?.includeDescription && desc) {
    return `${name} - ${desc}${suffix}`;
  }
  return `${name}${suffix}`;
}

/** Resolve service id to display name from a list */
export function resolveServiceName(
  serviceId: string | undefined | null,
  services: Array<LocalizedService & { id?: string }>,
  isEnglish: boolean,
): string {
  if (!serviceId) return "";
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(serviceId)) {
    return serviceId;
  }
  const found = services.find((s) => s.id === serviceId);
  return found ? getServiceName(found, isEnglish) : serviceId;
}

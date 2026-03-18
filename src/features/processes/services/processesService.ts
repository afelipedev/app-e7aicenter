import {
  defaultFavoriteIds,
  defaultMonitoredProcessIds,
  documentMonitoringsMock,
  monitoringFeedMock,
  processDetailsMock,
} from "../mocks/processesMockData";
import type {
  ApiConsumptionData,
  ApiConsumptionQueryParams,
  DashboardData,
  DocumentMonitoringItem,
  HistoricalListParams,
  MonitoringData,
  PaginatedProcesses,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessFilters,
  ProcessListParams,
  ProcessSummary,
} from "../types";
import type { ProcessProvider } from "../adapters/processProvider";
import { JuditConsumptionService } from "./juditConsumptionService";

const FAVORITES_STORAGE_KEY = "processes:favorites";
const DELETED_STORAGE_KEY = "processes:deleted";
const PROCESS_MONITORING_STORAGE_KEY = "processes:monitoring";
const DOCUMENT_MONITORING_STORAGE_KEY = "processes:document-monitoring";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const isBrowser = typeof window !== "undefined";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeDocument = (value: string) => value.replace(/\D/g, "");

const readStorage = (key: string, fallback: string[]) => {
  if (!isBrowser) {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);
  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: string[]) => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const getFavoriteIds = () => readStorage(FAVORITES_STORAGE_KEY, defaultFavoriteIds);
const getDeletedIds = () => readStorage(DELETED_STORAGE_KEY, []);
const getMonitoredProcessIds = () => readStorage(PROCESS_MONITORING_STORAGE_KEY, defaultMonitoredProcessIds);
const getDocumentMonitoringIds = () =>
  readStorage(
    DOCUMENT_MONITORING_STORAGE_KEY,
    documentMonitoringsMock.filter((item) => item.status === "Ativo").map((item) => item.id),
  );

const hydrateSummary = (process: ProcessDetail): ProcessSummary => {
  const favoriteIds = getFavoriteIds();
  const monitoredIds = getMonitoredProcessIds();

  return {
    id: process.id,
    cnj: process.cnj,
    title: process.title,
    activeParty: process.activeParty,
    passiveParty: process.passiveParty,
    tribunal: process.tribunal,
    grade: process.grade,
    createdAt: process.createdAt,
    distributedAt: process.distributedAt,
    status: monitoredIds.includes(process.id) ? "Monitorado" : process.status,
    orgaoJulgador: process.orgaoJulgador,
    classProcessual: process.classProcessual,
    assuntos: process.assuntos,
    tags: process.tags,
    parties: process.parties,
    value: process.value,
    lastMovement: process.lastMovement,
    favorite: favoriteIds.includes(process.id),
    monitored: monitoredIds.includes(process.id),
  };
};

const getVisibleProcesses = () => {
  const deletedIds = new Set(getDeletedIds());
  return processDetailsMock.filter((process) => !deletedIds.has(process.id));
};

const matchesFilters = (process: ProcessDetail, filters: ProcessFilters) => {
  if (filters.tags.length > 0 && !filters.tags.every((tag) => process.tags.includes(tag))) {
    return false;
  }

  if (
    filters.tribunals.length > 0 &&
    !filters.tribunals.some((t) => normalize(process.tribunal) === normalize(t))
  ) {
    return false;
  }

  if (
    filters.partyNames.length > 0 &&
    !filters.partyNames.some((name) =>
      process.parties.some((party) => normalize(party.name).includes(normalize(name))),
    )
  ) {
    return false;
  }

  if (
    filters.partySides.length > 0 &&
    !filters.partySides.some((side) =>
      process.parties.some((party) => normalize(party.side) === normalize(side)),
    )
  ) {
    return false;
  }

  if (
    filters.partyDocuments.length > 0 &&
    !filters.partyDocuments.some((doc) =>
      process.parties.some((party) =>
        normalizeDocument(party.document).includes(normalizeDocument(doc)),
      ),
    )
  ) {
    return false;
  }

  if (
    filters.classesProcessuais.length > 0 &&
    !filters.classesProcessuais.some((c) =>
      normalize(process.classProcessual).includes(normalize(c)),
    )
  ) {
    return false;
  }

  if (
    filters.assuntos.length > 0 &&
    !filters.assuntos.some((a) =>
      process.assuntos.some((subject) => normalize(subject).includes(normalize(a))),
    )
  ) {
    return false;
  }

  if (filters.distributedFrom && process.distributedAt.split("/").reverse().join("-") < filters.distributedFrom) {
    return false;
  }

  if (filters.distributedTo && process.distributedAt.split("/").reverse().join("-") > filters.distributedTo) {
    return false;
  }

  return true;
};

const getFilterOptions = (): ProcessFilterOptions => {
  const processes = getVisibleProcesses();
  const tribunals = new Set<string>();
  const partyNames = new Set<string>();
  const classesProcessuais = new Set<string>();
  const assuntos = new Set<string>();
  const partyDocuments = new Set<string>();

  for (const process of processes) {
    if (process.tribunal) tribunals.add(process.tribunal);
    if (process.classProcessual) classesProcessuais.add(process.classProcessual);
    for (const a of process.assuntos ?? []) if (a) assuntos.add(a);
    for (const party of process.parties ?? []) {
      if (party.name) partyNames.add(party.name);
      if (party.document) partyDocuments.add(party.document);
    }
  }

  return {
    tribunals: [...tribunals].sort(),
    partyNames: [...partyNames].sort(),
    classesProcessuais: [...classesProcessuais].sort(),
    assuntos: [...assuntos].sort(),
    partyDocuments: [...partyDocuments].sort(),
  };
};

const paginate = (items: ProcessSummary[], page: number, pageSize: number): PaginatedProcesses => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
};

const sortByCreatedAtDesc = (items: ProcessDetail[]) =>
  [...items].sort((left, right) => {
    const leftDate = left.createdAt.split("/").reverse().join("-");
    const rightDate = right.createdAt.split("/").reverse().join("-");
    return rightDate.localeCompare(leftDate);
  });

export const processesService: ProcessProvider = {
  async getDashboardData(): Promise<DashboardData> {
    await delay();

    const visibleProcesses = getVisibleProcesses();
    const hydrated = visibleProcesses.map(hydrateSummary);
    const favorites = hydrated.filter((process) => process.favorite).slice(0, 4);
    const monitoredDocuments = documentMonitoringsMock.filter((item) => getDocumentMonitoringIds().includes(item.id));

    return {
      stats: {
        queriedProcesses: hydrated.length,
        historicalQueries: visibleProcesses.filter((process) => process.parties.some((party) => party.documentType !== "OUTRO")).length,
        monitorings: hydrated.filter((process) => process.monitored).length + monitoredDocuments.length,
      },
      favorites,
    };
  },

  async listQueries(params: ProcessListParams): Promise<PaginatedProcesses> {
    await delay();

    const filtered = sortByCreatedAtDesc(getVisibleProcesses())
      .filter((process) => {
        if (!params.search) {
          return true;
        }

        const haystack = [process.cnj, process.title, process.activeParty, process.passiveParty].map(normalize).join(" ");
        return haystack.includes(normalize(params.search));
      })
      .filter((process) => matchesFilters(process, params.filters))
      .map(hydrateSummary);

    return paginate(filtered, params.page, params.pageSize);
  },

  async listHistoricalQueries(params: HistoricalListParams): Promise<PaginatedProcesses> {
    await delay();

    const filtered = sortByCreatedAtDesc(getVisibleProcesses())
      .filter((process) => matchesFilters(process, params.filters))
      .filter((process) => {
        if (!params.documentValue) {
          return true;
        }

        return process.parties.some((party) => {
          if (party.documentType !== params.documentType) {
            return false;
          }

          return normalizeDocument(party.document).includes(normalizeDocument(params.documentValue));
        });
      })
      .filter((process) => {
        if (!params.search) {
          return true;
        }

        return normalize(process.title).includes(normalize(params.search));
      })
      .map((process) => {
        const hydrated = hydrateSummary(process);

        if (params.documentValue) {
          hydrated.historyContext = {
            type: params.documentType,
            value: params.documentValue,
          };
        }

        return hydrated;
      });

    return paginate(filtered, params.page, params.pageSize);
  },

  async getProcessDetails(caseId: string): Promise<ProcessDetail | null> {
    await delay();

    const process = getVisibleProcesses().find((item) => item.id === caseId);
    if (!process) {
      return null;
    }

    const summary = hydrateSummary(process);
    return {
      ...process,
      ...summary,
    };
  },

  async getFilterOptions(): Promise<ProcessFilterOptions> {
    await delay();
    return getFilterOptions();
  },

  async getMonitoringData(): Promise<MonitoringData> {
    await delay();

    const monitoredIds = new Set(getMonitoredProcessIds());
    const monitoredProcesses = getVisibleProcesses()
      .filter((process) => monitoredIds.has(process.id))
      .map(hydrateSummary);

    const activeMonitoringIds = new Set(getDocumentMonitoringIds());
    const monitoredDocuments: DocumentMonitoringItem[] = documentMonitoringsMock.map((item) => ({
      ...item,
      status: activeMonitoringIds.has(item.id) ? "Ativo" : "Pausado",
    }));

    return {
      monitoredProcesses,
      monitoredDocuments,
      feed: monitoringFeedMock,
    };
  },

  async getApiConsumptionData(params: ApiConsumptionQueryParams): Promise<ApiConsumptionData> {
    return JuditConsumptionService.getConsumptionReport(params);
  },

  async toggleFavorite(processId: string) {
    await delay(80);

    const current = new Set(getFavoriteIds());
    if (current.has(processId)) {
      current.delete(processId);
    } else {
      current.add(processId);
    }

    writeStorage(FAVORITES_STORAGE_KEY, Array.from(current));
  },

  async deleteProcess(processId: string) {
    await delay(80);

    const current = new Set(getDeletedIds());
    current.add(processId);
    writeStorage(DELETED_STORAGE_KEY, Array.from(current));
  },

  async toggleProcessMonitoring(processId: string) {
    await delay(80);

    const current = new Set(getMonitoredProcessIds());
    if (current.has(processId)) {
      current.delete(processId);
    } else {
      current.add(processId);
    }

    writeStorage(PROCESS_MONITORING_STORAGE_KEY, Array.from(current));
  },

  async toggleDocumentMonitoring(monitoringId: string) {
    await delay(80);

    const current = new Set(getDocumentMonitoringIds());
    if (current.has(monitoringId)) {
      current.delete(monitoringId);
    } else {
      current.add(monitoringId);
    }

    writeStorage(DOCUMENT_MONITORING_STORAGE_KEY, Array.from(current));
  },
};

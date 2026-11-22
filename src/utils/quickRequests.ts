import type { QuickRequest, RequestStatus } from '../types';

export interface QuickRequestFilterState {
  search: string;
  macroRegion: string;
  urgency: string;
  collabFormat: string;
  status: 'ativos' | 'todos' | RequestStatus;
}

export const DEFAULT_QUICK_REQUEST_FILTERS: QuickRequestFilterState = {
  search: '',
  macroRegion: 'Todas',
  urgency: 'Todas',
  collabFormat: 'Todos',
  status: 'ativos',
};

const URGENCY_WEIGHT: Record<QuickRequest['urgency'], number> = {
  'Hoje / Urgente': 3,
  'Esta semana': 2,
  'Sem pressa': 1,
};

const STATUS_WEIGHT: Record<RequestStatus, number> = {
  aberto: 3,
  em_andamento: 2,
  resolvido: 0,
};

export function filterAndSortQuickRequests(
  requests: QuickRequest[],
  filters: QuickRequestFilterState
): QuickRequest[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return requests
    .filter((req) => {
      if (filters.status === 'ativos' && req.status === 'resolvido') {
        return false;
      }
      if (
        filters.status !== 'ativos' &&
        filters.status !== 'todos' &&
        req.status !== filters.status
      ) {
        return false;
      }
      if (filters.macroRegion !== 'Todas' && req.macroRegion !== filters.macroRegion) {
        return false;
      }
      if (filters.urgency !== 'Todas' && req.urgency !== filters.urgency) {
        return false;
      }
      if (filters.collabFormat !== 'Todos' && req.collabFormat !== filters.collabFormat) {
        return false;
      }
      if (normalizedSearch) {
        const haystack = [
          req.title,
          req.description,
          req.instrumentNeeded,
          req.genreContext,
          req.bpmAndKey,
          req.authorStageName,
          req.authorRegion,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const statusDiff = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
      if (statusDiff !== 0) return statusDiff;
      const urgencyDiff = URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function buildQuickRequestReplyMessage(
  request: QuickRequest,
  responderName: string
): string {
  const tempoInfo = request.bpmAndKey ? ` (${request.bpmAndKey})` : '';
  return `Olá ${request.authorStageName}! Vi seu pedido no Mural ("${request.title}"${tempoInfo}) buscando ${request.instrumentNeeded}. Sou ${responderName} e quero colaborar nessa faixa!`;
}

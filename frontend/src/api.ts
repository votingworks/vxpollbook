import React from 'react';
// import type { Api, BallotMode } from '@votingworks/design-backend';
import * as grout from '@votingworks/grout';
import {
  QueryClient,
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { BallotStyleId, BallotType, Id } from '@votingworks/types';
import type {
  Api,
  Voter,
  VoterSearchParams,
} from '@votingworks/pollbook-backend';

export type ApiClient = grout.Client<Api>;

export function createApiClient(): ApiClient {
  return grout.createClient<Api>({ baseUrl: '/api' });
}

export const ApiClientContext = React.createContext<ApiClient | undefined>(
  undefined
);

export function useApiClient(): ApiClient {
  const apiClient = React.useContext(ApiClientContext);
  if (!apiClient) {
    throw new Error('ApiClientContext.Provider not found');
  }
  return apiClient;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // In test, we only want to refetch when we explicitly invalidate. In
        // dev/prod, it's fine to refetch more aggressively.
        refetchOnMount: process.env.NODE_ENV !== 'test',
        useErrorBoundary: true,
      },
      mutations: {
        useErrorBoundary: true,
      },
    },
  });
}

export const searchVoters = {
  queryKey(searchParams?: VoterSearchParams): QueryKey {
    return searchParams ? ['searchVoters', searchParams] : ['searchVoters'];
  },
  useQuery(searchParams: VoterSearchParams) {
    const apiClient = useApiClient();
    return useQuery(this.queryKey(searchParams), () =>
      apiClient.searchVoters({ searchParams })
    );
  },
} as const;

export const getAllPeers = {
  queryKeyPrefix: 'getAllPeers',
  queryKey(): QueryKey {
    return [this.queryKeyPrefix];
  },
  useQuery() {
    const apiClient = useApiClient();
    return useQuery(this.queryKey(), () => apiClient.getAllPeers());
  },
} as const;

export const checkInVoter = {
  useMutation() {
    const apiClient = useApiClient();
    const queryClient = useQueryClient();
    return useMutation(apiClient.checkInVoter, {
      async onSuccess() {
        await queryClient.invalidateQueries(searchVoters.queryKey());
      },
    });
  },
} as const;

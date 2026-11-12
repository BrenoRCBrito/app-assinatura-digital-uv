import React, { createContext, useContext, useState } from 'react';

import { solicitarSincronizacao } from '../services/solicitacaoDeSincronizacao';
import { comGatilhoDeSincronizacao } from './comGatilhoDeSincronizacao';
import { createRepositories, STORAGE_TYPE } from './createRepositories';
import type { Repositories } from './repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

export function RepositoriesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [repositories] = useState(() =>
    comGatilhoDeSincronizacao(createRepositories(STORAGE_TYPE), solicitarSincronizacao),
  );

  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const context = useContext(RepositoriesContext);
  if (context === null) {
    throw new Error('useRepositories precisa estar dentro de RepositoriesProvider.');
  }
  return context;
}

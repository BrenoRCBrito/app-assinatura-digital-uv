import React, { createContext, useContext, useState } from 'react';

import { createRepositories, STORAGE_TYPE } from './createRepositories';
import type { Repositories } from './repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

export function RepositoriesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [repositories] = useState(() => createRepositories(STORAGE_TYPE));

  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const context = useContext(RepositoriesContext);
  if (context === null) {
    throw new Error('useRepositories precisa estar dentro de RepositoriesProvider.');
  }
  return context;
}
